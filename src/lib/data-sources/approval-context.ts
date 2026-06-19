import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

interface ApprovalSummaryItem {
  id: string;
  title: string;
  status: string;
  category: string;
  isUrgent: boolean;
  requesterName: string;
  requesterDept: string;
  approvers: string[];
  ccList: string[];
  createdAt: string;
  submittedAt: string | null;
  completedAt: string | null;
}

const STATUS_KR: Record<string, string> = {
  draft: "임시저장",
  pending: "대기중",
  in_progress: "진행중",
  approved: "승인완료",
  rejected: "반려",
  canceled: "취소됨",
};

export async function buildApprovalContext(userUid?: string): Promise<string> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("approvals")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  if (snapshot.empty) return "";

  const items: ApprovalSummaryItem[] = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title,
      status: d.status,
      category: d.category || "기타",
      isUrgent: d.isUrgent || false,
      requesterName: d.requester?.name || "",
      requesterDept: d.requester?.department || "",
      approvers: (d.approvalLine || []).map(
        (s: { approver: { name: string }; status: string }) =>
          `${s.approver.name}(${STATUS_KR[s.status] || s.status})`
      ),
      ccList: (d.ccList || []).map((c: { name: string }) => c.name),
      createdAt: d.createdAt?.toDate?.()?.toISOString() || "",
      submittedAt: d.submittedAt?.toDate?.()?.toISOString() || null,
      completedAt: d.completedAt?.toDate?.()?.toISOString() || null,
    };
  });

  const statusCounts: Record<string, number> = {};
  for (const item of items) {
    const label = STATUS_KR[item.status] || item.status;
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  }

  const myItems = userUid
    ? items.filter(
        (i) =>
          i.requesterName !== "" &&
          snapshot.docs.some(
            (doc) => doc.id === i.id && doc.data().requester?.uid === userUid
          )
      )
    : [];

  const myPendingApproval = userUid
    ? items.filter((i) =>
        snapshot.docs.some((doc) => {
          if (doc.id !== i.id) return false;
          const line = doc.data().approvalLine || [];
          return line.some(
            (s: { approver: { uid: string }; status: string }) =>
              s.approver.uid === userUid && s.status === "current"
          );
        })
      )
    : [];

  let context = `\n## [전자결재] (실시간 조회, 최근 ${items.length}건)\n\n`;

  context += `상태 현황: ${Object.entries(statusCounts)
    .map(([k, v]) => `${k} ${v}건`)
    .join(", ")}\n\n`;

  if (myPendingApproval.length > 0) {
    context += `### 내가 결재할 문서 (${myPendingApproval.length}건)\n`;
    for (const item of myPendingApproval) {
      context += `- ${item.isUrgent ? "[긴급] " : ""}${item.title} (기안: ${item.requesterName}, ${item.category})\n`;
    }
    context += "\n";
  }

  if (myItems.length > 0) {
    context += `### 내가 요청한 결재 (최근 ${Math.min(myItems.length, 10)}건)\n`;
    for (const item of myItems.slice(0, 10)) {
      context += `- ${item.isUrgent ? "[긴급] " : ""}${item.title} — ${STATUS_KR[item.status]} (${item.approvers.join(" → ")})\n`;
    }
    context += "\n";
  }

  context += `### 전체 결재 목록 (최근 ${Math.min(items.length, 20)}건)\n`;
  context += "| 제목 | 상태 | 기안자 | 카테고리 | 결재자 | 참조 |\n";
  context += "|------|------|--------|----------|--------|------|\n";
  for (const item of items.slice(0, 20)) {
    context += `| ${item.isUrgent ? "🔴 " : ""}${item.title} | ${STATUS_KR[item.status]} | ${item.requesterName}(${item.requesterDept}) | ${item.category} | ${item.approvers.join("→")} | ${item.ccList.join(", ") || "-"} |\n`;
  }

  return context;
}
