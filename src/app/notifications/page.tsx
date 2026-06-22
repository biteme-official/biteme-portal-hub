"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">알림</h1>
          <p className="text-sm text-text-secondary mt-1">
            읽지 않은 알림 {unreadCount}건
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/5 rounded-lg transition-colors"
          >
            <CheckCheck size={14} />
            모두 읽음 처리
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-accent text-accent"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {f === "all" ? "전체" : "읽지 않음"}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell size={40} className="text-text-secondary/30 mb-3" />
          <p className="text-sm text-text-secondary">
            {filter === "unread" ? "읽지 않은 알림이 없습니다" : "알림이 없습니다"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {filtered.map((n) => (
            <Link
              key={n.id}
              href={getNotificationHref(n)}
              onClick={() => {
                if (!n.isRead) markAsRead([n.id]);
              }}
              className={`flex items-start gap-3 px-4 py-4 hover:bg-surface border-b border-border last:border-0 no-underline transition-colors ${
                n.isRead ? "opacity-50" : ""
              }`}
            >
              <span
                className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${TYPE_ICON_COLOR[n.type]}`}
              >
                {NOTIFICATION_TYPE_LABELS[n.type][0]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-text-secondary">
                    {NOTIFICATION_TYPE_LABELS[n.type]}
                  </span>
                  {!n.isRead && (
                    <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                  )}
                </div>
                <p className="text-sm text-text-primary">{n.body}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {n.createdAt
                    ? formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })
                    : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
