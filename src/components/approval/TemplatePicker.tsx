"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookmarkPlus,
  BookMarked,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { UserRef, ApprovalCategory } from "@/lib/types/approval";

interface Template {
  id: string;
  name: string;
  approvers: UserRef[];
  ccList: UserRef[];
  category: ApprovalCategory;
}

interface TemplatePickerProps {
  approvers: UserRef[];
  ccList: UserRef[];
  category: ApprovalCategory;
  onLoad: (t: {
    approvers: UserRef[];
    ccList: UserRef[];
    category: ApprovalCategory;
  }) => void;
}

export default function TemplatePicker({
  approvers,
  ccList,
  category,
  onLoad,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/approvals/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleSave() {
    if (!saveName.trim() || approvers.length === 0) return;
    setSaving(true);
    await fetch("/api/approvals/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        approvers,
        ccList,
        category,
      }),
    });
    setSaveName("");
    setShowSaveInput(false);
    setSaving(false);
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    await fetch("/api/approvals/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchTemplates();
  }

  return (
    <div className="flex items-center gap-2">
      {/* Load template */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
        >
          <BookMarked size={12} />
          템플릿
          <ChevronDown size={10} />
        </button>

        {open && (
          <div className="absolute top-full mt-1 left-0 sm:left-auto sm:right-0 w-64 bg-white rounded-lg shadow-lg border border-border z-50 overflow-hidden">
            {templates.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-text-secondary">
                저장된 템플릿이 없습니다
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface border-b border-border last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoad({
                          approvers: t.approvers,
                          ccList: t.ccList,
                          category: t.category,
                        });
                        setOpen(false);
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm text-text-primary">{t.name}</p>
                      <p className="text-[11px] text-text-secondary">
                        {t.approvers.map((a) => a.name).join(" → ")}
                        {t.ccList.length > 0 &&
                          ` · 참조: ${t.ccList.map((c) => c.name).join(", ")}`}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1 text-text-secondary hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save template */}
      {showSaveInput ? (
        <div className="flex items-center gap-1.5">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="템플릿 이름"
            className="h-7 w-32 px-2 text-xs rounded border border-border bg-surface focus:outline-none focus:border-accent"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !saveName.trim() || approvers.length === 0}
            className="h-7 px-2 text-xs bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSaveInput(false);
              setSaveName("");
            }}
            className="h-7 px-2 text-xs text-text-secondary hover:text-text-primary"
          >
            취소
          </button>
        </div>
      ) : (
        approvers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSaveInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors"
          >
            <BookmarkPlus size={12} />
            현재 라인 저장
          </button>
        )
      )}
    </div>
  );
}
