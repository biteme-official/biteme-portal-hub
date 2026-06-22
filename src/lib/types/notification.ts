export type NotificationType =
  | "approval_submitted"
  | "approval_approved"
  | "approval_rejected"
  | "approval_canceled"
  | "approval_comment"
  | "approval_reminder"
  | "user_registered";

export interface Notification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  approvalId?: string;
  approvalTitle?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  approval_submitted: "결재 요청",
  approval_approved: "승인 완료",
  approval_rejected: "반려",
  approval_canceled: "결재 취소",
  approval_comment: "코멘트",
  approval_reminder: "미결재 알림",
  user_registered: "신규 가입",
};
