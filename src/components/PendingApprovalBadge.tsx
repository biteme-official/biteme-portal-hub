"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, X, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface PendingItem {
  id: string;
  title: string;
  isUrgent: boolean;
  requesterName: string;
  category: string;
  createdAt: string;
}

export default function PendingApprovalBadge() {
  const { user, loading } = useAuth();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals/pending-count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
        setItems(data.items || []);
        return data.count;
      }
    } catch {
      // silent
    }
    return 0;
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    fetchPending().then((c: number) => {
      if (c > 0) {
        const dismissed = sessionStorage.getItem("pending-toast-dismissed");
        if (!dismissed) {
          setShowToast(true);
        }
      }
    });

    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [loading, user, fetchPending]);

  function dismissToast() {
    setShowToast(false);
    setToastDismissed(true);
    sessionStorage.setItem("pending-toast-dismissed", "1");
  }

  if (loading || !user) return null;

  return (
    <>
      {/* Header Badge */}
      <Link
        href="/approval?tab=my-approvals"
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors no-underline"
        title="미결재 문서"
      >
        <ClipboardCheck size={16} className="text-white/70" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>

      {/* Toast Notification */}
      {showToast && !toastDismissed && count > 0 && (
        <div className="fixed top-16 right-3 sm:right-5 z-[100] w-[calc(100vw-1.5rem)] sm:w-80 max-w-80 bg-white rounded-xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-3 bg-accent/5 border-b border-border">
            <AlertTriangle size={16} className="text-accent shrink-0" />
            <span className="text-sm font-semibold text-text-primary flex-1">
              미결재 문서 {count}건
            </span>
            <button
              onClick={dismissToast}
              className="p-0.5 rounded hover:bg-surface text-text-secondary"
            >
              <X size={14} />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {items.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/approval/${item.id}`}
                onClick={dismissToast}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface border-b border-border last:border-0 no-underline"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {item.isUrgent && (
                      <span className="text-red-500 font-bold mr-1">
                        [긴급]
                      </span>
                    )}
                    {item.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {item.requesterName} · {item.category}
                  </p>
                </div>
                <ChevronRight size={14} className="text-text-secondary shrink-0" />
              </Link>
            ))}
          </div>
          <Link
            href="/approval?tab=my-approvals"
            onClick={dismissToast}
            className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-accent hover:bg-accent/5 border-t border-border no-underline"
          >
            전체 미결재 문서 보기
            <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </>
  );
}
