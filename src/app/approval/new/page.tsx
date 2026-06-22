"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { StampLineEditor } from "@/components/approval/StampLine";
import ApproverPicker from "@/components/approval/ApproverPicker";
import FileUpload from "@/components/approval/FileUpload";
import TemplatePicker from "@/components/approval/TemplatePicker";
import { useAuth } from "@/contexts/AuthContext";
import {
  APPROVAL_CATEGORIES,
  type ApprovalCategory,
  type UserRef,
  type Attachment,
  type VoteType,
  type VoteOption,
} from "@/lib/types/approval";

export default function NewApprovalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ApprovalCategory>("기타");
  const [isUrgent, setIsUrgent] = useState(false);
  const [approvers, setApprovers] = useState<UserRef[]>([]);
  const [ccList, setCcList] = useState<UserRef[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [voteType, setVoteType] = useState<VoteType>("none");
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([
    { id: "1", label: "1안", description: "" },
    { id: "2", label: "2안", description: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveDraft() {
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, isUrgent, approvers, ccList, attachments, voteType, voteOptions: voteType === "options" ? voteOptions : [] }),
    });

    if (res.ok) {
      router.push("/approval");
    } else {
      const data = await res.json();
      setError(data.error || "저장에 실패했습니다.");
    }
    setSaving(false);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (approvers.length === 0) {
      setError("결재자를 1명 이상 지정해주세요.");
      return;
    }
    if (voteType === "options" && voteOptions.filter(o => o.label.trim()).length < 2) {
      setError("안건 선택형은 최소 2개 옵션이 필요합니다.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const createRes = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, isUrgent, approvers, ccList, attachments, voteType, voteOptions: voteType === "options" ? voteOptions : [] }),
    });

    if (!createRes.ok) {
      const data = await createRes.json();
      setError(data.error || "생성에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    const { id } = await createRes.json();

    const submitRes = await fetch(`/api/approvals/${id}/submit`, {
      method: "POST",
    });

    if (submitRes.ok) {
      router.push("/approval");
    } else {
      const data = await submitRes.json();
      setError(data.error || "제출에 실패했습니다.");
    }
    setSubmitting(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/approval"
          className="p-1.5 rounded-lg hover:bg-surface text-text-secondary transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">새 결재 요청</h1>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-5">
        {/* Stamp Line - 결재 도장 라인 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-text-primary">결재라인</span>
          <TemplatePicker
            approvers={approvers}
            ccList={ccList}
            category={category}
            onLoad={(t) => {
              setApprovers(t.approvers);
              setCcList(t.ccList);
              setCategory(t.category);
            }}
          />
        </div>
        <StampLineEditor
          requester={{
            name: user?.name || "",
            photoURL: user?.photoURL,
          }}
          approvers={approvers}
          onChange={setApprovers}
        />

        <div className="border-t border-border pt-5">
          <ApproverPicker
            selected={ccList}
            onChange={setCcList}
            excludeUid={user?.uid || ""}
            excludeUids={approvers.map((a) => a.uid)}
            label="참조 (CC)"
            placeholder="참조자 검색 (이름, 이메일, 부서)"
            showOrder={false}
            showTeamPicker
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            제목 *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="결재 제목을 입력하세요"
            className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-primary mb-1">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ApprovalCategory)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            >
              {APPROVAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="block text-sm font-medium text-text-primary mb-1">
              긴급여부
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={isUrgent}
              onClick={() => setIsUrgent(!isUrgent)}
              className={`relative inline-flex h-10 w-[88px] items-center rounded-full transition-colors ${
                isUrgent ? "bg-red-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute left-1 text-xs font-medium transition-opacity ${
                  isUrgent ? "opacity-100 text-white" : "opacity-0"
                }`}
                style={{ left: 10 }}
              >
                긴급
              </span>
              <span
                className={`absolute right-1 text-xs font-medium transition-opacity ${
                  isUrgent ? "opacity-0" : "opacity-100 text-text-secondary"
                }`}
                style={{ right: 10 }}
              >
                일반
              </span>
              <span
                className={`inline-block h-8 w-8 rounded-full bg-white shadow-md transform transition-transform ${
                  isUrgent ? "translate-x-[52px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            내용
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상세 내용을 입력하세요"
            rows={6}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* 의견 수집 유형 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            의견 수집
          </label>
          <div className="flex gap-2">
            {([["none", "없음"], ["options", "안건 선택형"], ["yesno", "Y/N 투표"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setVoteType(val)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  voteType === val
                    ? "bg-accent text-white border-accent"
                    : "bg-surface text-text-secondary border-border hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {voteType === "options" && (
            <div className="mt-3 space-y-2">
              {voteOptions.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary w-6 text-center shrink-0">{i + 1}안</span>
                  <input
                    value={opt.label}
                    onChange={(e) => {
                      const next = [...voteOptions];
                      next[i] = { ...next[i], label: e.target.value };
                      setVoteOptions(next);
                    }}
                    placeholder={`${i + 1}안 제목`}
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    value={opt.description || ""}
                    onChange={(e) => {
                      const next = [...voteOptions];
                      next[i] = { ...next[i], description: e.target.value };
                      setVoteOptions(next);
                    }}
                    placeholder="설명 (선택)"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
                  />
                  {voteOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setVoteOptions(voteOptions.filter((_, j) => j !== i))}
                      className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setVoteOptions([
                    ...voteOptions,
                    { id: String(Date.now()), label: `${voteOptions.length + 1}안`, description: "" },
                  ])
                }
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors mt-1"
              >
                <Plus size={14} />
                옵션 추가
              </button>
            </div>
          )}

          {voteType === "yesno" && (
            <p className="mt-2 text-xs text-text-secondary">
              결재자가 찬성(Y) / 반대(N) 의견을 선택한 후 승인/반려합니다.
            </p>
          )}
        </div>

        <FileUpload files={attachments} onChange={setAttachments} />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            임시저장
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            결재 요청
          </button>
        </div>
      </div>
    </div>
  );
}
