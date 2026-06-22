"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  NOTIFICATION_TYPE_LABELS,
  type Notification,
  type NotificationType,
} from "@/lib/types/notification";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const TYPE_ICON_COLOR: Record<NotificationType, string> = {
  approval_submitted: "bg-accent/10 text-accent",
  approval_approved: "bg-green-100 text-green-600",
  approval_rejected: "bg-red-100 text-red-600",
  approval_canceled: "bg-gray-100 text-gray-500",
  approval_comment: "bg-blue-100 text-blue-600",
  approval_reminder: "bg-yellow-100 text-yellow-600",
  user_registered: "bg-purple-100 text-purple-600",
};

function getNotificationHref(n: Notification): string {
  if (n.linkUrl) return n.linkUrl;
  if (n.approvalId) return `/approval/${n.approvalId}`;
  return "/notifications";
}

export default function NotificationBell() {
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [loading, user, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  if (loading || !user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell size={16} className="text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] sm:w-96 max-w-96 bg-white rounded-xl shadow-2xl border border-border overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <CheckCheck size={12} />
                모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-secondary">
                알림이 없습니다
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <Link
                  key={n.id}
                  href={getNotificationHref(n)}
                  onClick={() => {
                    if (!n.isRead) markAsRead([n.id]);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-surface border-b border-border last:border-0 no-underline transition-colors ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${TYPE_ICON_COLOR[n.type]}`}
                  >
                    {NOTIFICATION_TYPE_LABELS[n.type][0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {n.createdAt
                        ? formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: ko,
                          })
                        : ""}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 bg-accent rounded-full shrink-0 mt-2" />
                  )}
                </Link>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center py-2.5 text-xs font-medium text-accent hover:bg-accent/5 border-t border-border no-underline"
            >
              전체 알림 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
