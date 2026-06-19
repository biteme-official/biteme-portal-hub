"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Comment } from "@/lib/types/approval";

export default function CommentThread({
  comments,
  approvalId,
  onCommentAdded,
}: {
  comments: Comment[];
  approvalId: string;
  onCommentAdded: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    const res = await fetch(`/api/approvals/${approvalId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (res.ok) {
      setText("");
      onCommentAdded();
    }
    setSubmitting(false);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        코멘트 ({comments.length})
      </h3>

      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              {c.author.photoURL ? (
                <img
                  src={c.author.photoURL}
                  alt={c.author.name}
                  className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {c.author.name[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-text-primary">
                    {c.author.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatDistanceToNow(new Date(c.createdAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="코멘트를 입력하세요..."
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="h-10 px-4 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </form>
    </div>
  );
}
