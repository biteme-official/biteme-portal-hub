"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  Ban,
  Loader2,
  FileText,
  Paperclip,
  Eye,
  Image,
  Link2,
} from "lucide-react";
import StatusBadge from "@/components/approval/StatusBadge";
import { StampLineDisplay } from "@/components/approval/StampLine";
import CommentThread from "@/components/approval/CommentThread";
import { useAuth } from "@/contexts/AuthContext";
import type { ApprovalRequest } from "@/lib/types/approval";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fetchApproval = useCallback(async () => {
    const res = await fetch(`/api/approvals/${id}`);
    if (res.ok) setApproval(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchApproval();
  }, [fetchApproval]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary">결재 문서를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const isRequester = user?.uid === approval.requester.uid;
  const currentStep = approval.approvalLine.find(
    (s) => s.status === "current"
  );
  const isCurrentApprover = currentStep?.approver.uid === user?.uid;
  const canApprove =
    isCurrentApprover &&
    (approval.status === "pending" || approval.status === "in_progress");
  const canCancel =
    isRequester &&
    (approval.status === "pending" || approval.status === "in_progress");

  async function handleApprove() {
    setActionLoading(true);
    await fetch(`/api/approvals/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    fetchApproval();
    setActionLoading(false);
  }

  async function handleReject() {
    if (!rejectComment.trim()) return;
    setActionLoading(true);
    await fetch(`/api/approvals/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", comment: rejectComment }),
    });
    fetchApproval();
    setShowRejectForm(false);
    setActionLoading(false);
  }

  async function handleCancel() {
    if (!confirm("결재를 취소하시겠습니까?")) return;
    setActionLoading(true);
    await fetch(`/api/approvals/${id}/cancel`, { method: "POST" });
    fetchApproval();
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm("임시저장된 결재를 삭제하시겠습니까?")) return;
    await fetch(`/api/approvals/${id}`, { method: "DELETE" });
    router.push("/approval");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/approval"
          className="p-1.5 rounded-lg hover:bg-surface text-text-secondary transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {approval.isUrgent && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">
                긴급
              </span>
            )}
            <h1 className="text-xl font-bold text-text-primary">
              {approval.title}
            </h1>
            <StatusBadge status={approval.status} />
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {approval.requester.name} · {approval.category} ·{" "}
            {formatDistanceToNow(new Date(approval.createdAt), {
              addSuffix: true,
              locale: ko,
            })}
          </p>
        </div>
      </div>

      {/* Stamp Line - 결재 도장 라인 (상단) */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <StampLineDisplay
          requester={approval.requester}
          steps={approval.approvalLine}
          submittedAt={approval.submittedAt}
        />
        {approval.ccList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <Eye size={12} className="text-text-secondary shrink-0" />
            <span className="text-xs text-text-secondary">참조:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {approval.ccList.map((cc) => (
                <span
                  key={cc.uid}
                  className="inline-flex items-center gap-1 text-xs text-text-primary bg-surface px-2 py-0.5 rounded-full"
                >
                  {cc.photoURL ? (
                    <img
                      src={cc.photoURL}
                      alt={cc.name}
                      className="w-4 h-4 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-accent/10 text-accent text-[8px] font-bold flex items-center justify-center">
                      {cc.name[0]}
                    </span>
                  )}
                  {cc.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content - 단일 컬럼 */}
      <div className="space-y-4">
        {/* Description */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <FileText size={14} />
            내용
          </h2>
          <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {approval.description || "내용 없음"}
          </div>
        </div>

        {/* Attachments */}
        {approval.attachments.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Paperclip size={14} />
              첨부 ({approval.attachments.length})
            </h2>
            {approval.attachments.filter((f) => f.kind === "image").length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {approval.attachments
                  .filter((f) => f.kind === "image")
                  .map((img, i) => (
                    <a
                      key={i}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-24 h-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
              </div>
            )}
            <div className="space-y-1.5">
              {approval.attachments
                .filter((f) => f.kind !== "image")
                .map((file, i) => {
                  const Icon = file.kind === "link" ? Link2 : FileText;
                  return (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors no-underline"
                    >
                      <Icon
                        size={14}
                        className={`shrink-0 ${file.kind === "link" ? "text-accent" : "text-text-secondary"}`}
                      />
                      <span className="text-sm text-accent flex-1 truncate">
                        {file.name}
                      </span>
                      {file.size > 0 && (
                        <span className="text-xs text-text-secondary">
                          {(file.size / 1024).toFixed(0)}KB
                        </span>
                      )}
                    </a>
                  );
                })}
            </div>
          </div>
        )}

        {/* Actions */}
        {(canApprove || canCancel || approval.status === "draft") && (
          <div className="bg-white rounded-xl border border-border p-5">
            {canApprove && !showRejectForm && (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  승인
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                  반려
                </button>
              </div>
            )}

            {showRejectForm && (
              <div className="space-y-3">
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="반려 사유를 입력하세요 (필수)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-red-400 resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectComment.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                    반려 확인
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectComment("");
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface transition-colors disabled:opacity-50 ${
                  canApprove ? "mt-3" : ""
                }`}
              >
                <Ban size={14} />
                결재 취소
              </button>
            )}

            {approval.status === "draft" && isRequester && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
              >
                <X size={14} />
                삭제
              </button>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-xl border border-border p-5">
          <CommentThread
            comments={approval.comments}
            approvalId={approval.id}
            onCommentAdded={fetchApproval}
          />
        </div>
      </div>
    </div>
  );
}
