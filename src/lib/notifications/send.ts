import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendSlackDm } from "./slack";
import type { NotificationType } from "@/lib/types/notification";

interface NotifyParams {
  recipientUids: string[];
  type: NotificationType;
  title: string;
  body: string;
  approvalId?: string;
  approvalTitle?: string;
  linkUrl?: string;
  targetUserUid?: string;
}

async function getEmailsByUids(uids: string[]): Promise<string[]> {
  if (uids.length === 0) return [];
  const db = getAdminDb();
  const emails: string[] = [];
  for (const uid of uids) {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      emails.push(doc.data()!.email);
    }
  }
  return emails;
}

export async function dispatchNotification(params: NotifyParams) {
  const db = getAdminDb();
  const batch = db.batch();

  for (const uid of params.recipientUids) {
    const docRef = db.collection("notifications").doc();
    const doc: Record<string, unknown> = {
      recipientUid: uid,
      type: params.type,
      title: params.title,
      body: params.body,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (params.approvalId) doc.approvalId = params.approvalId;
    if (params.approvalTitle) doc.approvalTitle = params.approvalTitle;
    if (params.linkUrl) doc.linkUrl = params.linkUrl;
    if (params.targetUserUid) doc.targetUserUid = params.targetUserUid;
    batch.set(docRef, doc);
  }

  await batch.commit();

  try {
    const emails = await getEmailsByUids(params.recipientUids);
    await sendSlackDm({
      recipientEmails: emails,
      type: params.type,
      title: params.title,
      body: params.body,
      approvalId: params.approvalId,
      linkUrl: params.linkUrl,
      targetUserUid: params.targetUserUid,
    });
  } catch (e) {
    console.error("Slack DM error:", e);
  }
}

export async function notifyApprovalSubmitted(
  approvalId: string,
  approvalTitle: string,
  requesterName: string,
  approverUids: string[],
  ccUids: string[]
) {
  await dispatchNotification({
    recipientUids: [...approverUids, ...ccUids],
    type: "approval_submitted",
    title: "새 결재 요청",
    body: `${requesterName}님이 "${approvalTitle}" 결재를 요청했습니다.`,
    approvalId,
    approvalTitle,
  });
}

export async function notifyApprovalDecided(
  approvalId: string,
  approvalTitle: string,
  approverName: string,
  action: "approve" | "reject",
  requesterUid: string,
  comment?: string
) {
  const isApproved = action === "approve";
  await dispatchNotification({
    recipientUids: [requesterUid],
    type: isApproved ? "approval_approved" : "approval_rejected",
    title: isApproved ? "결재 승인" : "결재 반려",
    body: isApproved
      ? `${approverName}님이 "${approvalTitle}"을(를) 승인했습니다.`
      : `${approverName}님이 "${approvalTitle}"을(를) 반려했습니다.${comment ? ` 사유: ${comment}` : ""}`,
    approvalId,
    approvalTitle,
  });
}

export async function notifyApprovalCanceled(
  approvalId: string,
  approvalTitle: string,
  requesterName: string,
  approverUids: string[],
  ccUids: string[]
) {
  await dispatchNotification({
    recipientUids: [...approverUids, ...ccUids],
    type: "approval_canceled",
    title: "결재 취소",
    body: `${requesterName}님이 "${approvalTitle}" 결재를 취소했습니다.`,
    approvalId,
    approvalTitle,
  });
}

export async function notifyComment(
  approvalId: string,
  approvalTitle: string,
  authorName: string,
  recipientUids: string[]
) {
  await dispatchNotification({
    recipientUids,
    type: "approval_comment",
    title: "새 코멘트",
    body: `${authorName}님이 "${approvalTitle}"에 코멘트를 남겼습니다.`,
    approvalId,
    approvalTitle,
  });
}

export async function notifyNewUserRegistered(
  userName: string,
  userEmail: string,
  userUid?: string
) {
  const db = getAdminDb();
  const adminsSnap = await db
    .collection("users")
    .where("role", "==", "admin")
    .where("isActive", "==", true)
    .get();

  const adminUids = adminsSnap.docs.map((doc) => doc.id);
  if (adminUids.length === 0) {
    console.warn("notifyNewUserRegistered: no active admins found, skipping");
    return;
  }

  await dispatchNotification({
    recipientUids: adminUids,
    type: "user_registered",
    title: "신규 사용자 가입",
    body: `${userName}(${userEmail})님이 포털에 가입했습니다.`,
    linkUrl: "/admin/users",
    targetUserUid: userUid,
  });
}
