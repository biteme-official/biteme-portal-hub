import "server-only";
// 파일 위치는 그대로 두었지만 결재 데이터는 이제 Firestore 가 아니라 KMS API 에 있다 (src/lib/kms/client.ts)
import { kms, kmsAll, KmsError } from "@/lib/kms/client";
import type {
  ApprovalRequest,
  ApprovalFormData,
  UserRef,
  ApprovalStatus,
} from "@/lib/types/approval";

export async function createApproval(
  data: ApprovalFormData,
  requester: UserRef
): Promise<string> {
  const res = await kms<{ id: string }>("/approvals", {
    method: "POST",
    actorUid: requester.uid,
    body: { ...data, requester },
  });
  return res.id;
}

export async function getApproval(
  id: string
): Promise<ApprovalRequest | null> {
  try {
    return await kms<ApprovalRequest>(`/approvals/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof KmsError && e.status === 404) return null;
    throw e;
  }
}

export async function listApprovals(filters: {
  requesterUid?: string;
  approverUid?: string;
  ccUid?: string;
  status?: ApprovalStatus | ApprovalStatus[];
  limit?: number;
}): Promise<ApprovalRequest[]> {
  const query = {
    requester_uid: filters.requesterUid,
    approver_uid: filters.approverUid,
    cc_uid: filters.ccUid,
    status: Array.isArray(filters.status) ? filters.status.join(",") : filters.status,
  };
  if (filters.limit) {
    const res = await kms<{ data: ApprovalRequest[] }>("/approvals", {
      query: { ...query, per_page: filters.limit },
    });
    return res.data;
  }
  return kmsAll<ApprovalRequest>("/approvals", query);
}

/** 지금 내가 결재할 차례인 문서 (배지) */
export async function listPendingForMe(uid: string) {
  return kms<{
    count: number;
    items: { id: string; title: string; isUrgent: boolean; requesterName: string; category: string; createdAt: string }[];
  }>("/approvals/pending", { actorUid: uid });
}

export async function updateDraft(
  id: string,
  requesterUid: string,
  data: Partial<ApprovalFormData>
) {
  await kms(`/approvals/${encodeURIComponent(id)}`, { method: "PATCH", actorUid: requesterUid, body: data });
}

export async function deleteDraft(id: string, requesterUid: string) {
  await kms(`/approvals/${encodeURIComponent(id)}`, { method: "DELETE", actorUid: requesterUid });
}

export async function submitApproval(id: string, requesterUid: string) {
  await kms(`/approvals/${encodeURIComponent(id)}/submit`, { method: "POST", actorUid: requesterUid });
}

export async function decideStep(
  id: string,
  approverUid: string,
  action: "approve" | "reject",
  comment?: string,
  vote?: { selectedOption?: string | null; yesNoVote?: boolean | null }
) {
  await kms(`/approvals/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    actorUid: approverUid,
    body: { action, comment: comment || null, ...(vote ?? {}) },
  });
}

export async function deleteApprovalAsAdmin(id: string) {
  await kms(`/approvals/${encodeURIComponent(id)}`, { method: "DELETE", query: { admin: 1 } });
}

export async function deleteAllApprovals(): Promise<number> {
  const res = await kms<{ deleted: number }>("/approvals", { method: "DELETE" });
  return res.deleted;
}

export async function cancelApproval(id: string, requesterUid: string) {
  await kms(`/approvals/${encodeURIComponent(id)}/cancel`, { method: "POST", actorUid: requesterUid });
}

export async function addComment(
  id: string,
  author: UserRef,
  text: string
) {
  await kms(`/approvals/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    actorUid: author.uid,
    body: { author, text },
  });
}

/** 지금 내 차례인 결재 1건을 다른 사람에게 넘긴다 */
export async function delegateStep(
  id: string,
  actor: { uid: string; name: string },
  delegateTo: UserRef
) {
  await kms(`/approvals/${encodeURIComponent(id)}/delegate`, {
    method: "POST",
    actorUid: actor.uid,
    body: { actorName: actor.name, delegateTo },
  });
}

/** Firestore 이관·테스트 데이터용: 포털 형식 그대로 id 기준 덮어쓰기 */
export async function importRecords(
  kind: "approvals" | "templates" | "delegations" | "notifications",
  records: Record<string, unknown>[]
) {
  return kms<{ imported: number }>(`/import/${kind}`, { method: "POST", body: { records } });
}
