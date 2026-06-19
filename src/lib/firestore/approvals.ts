import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type {
  ApprovalRequest,
  ApprovalFormData,
  UserRef,
  ApprovalStatus,
} from "@/lib/types/approval";

function tsToString(ts: FirebaseFirestore.Timestamp | null): string | null {
  return ts?.toDate?.()?.toISOString() ?? null;
}

function docToApproval(
  doc: FirebaseFirestore.DocumentSnapshot
): ApprovalRequest {
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title,
    description: d.description,
    category: d.category,
    isUrgent: d.isUrgent || false,
    requester: d.requester,
    status: d.status,
    approvalLine: d.approvalLine || [],
    currentStep: d.currentStep || 0,
    ccList: d.ccList || [],
    attachments: d.attachments || [],
    comments: d.comments || [],
    createdAt: tsToString(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToString(d.updatedAt) || new Date().toISOString(),
    submittedAt: tsToString(d.submittedAt),
    completedAt: tsToString(d.completedAt),
  };
}

export async function createApproval(
  data: ApprovalFormData,
  requester: UserRef
): Promise<string> {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc();

  const approvalLine = data.approvers.map((approver, i) => ({
    stepOrder: i + 1,
    approver,
    status: "waiting" as const,
    comment: null,
    decidedAt: null,
  }));

  await docRef.set({
    title: data.title,
    description: data.description,
    category: data.category,
    isUrgent: data.isUrgent || false,
    requester,
    status: "draft",
    approvalLine,
    currentStep: 0,
    ccList: data.ccList || [],
    attachments: data.attachments || [],
    comments: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    submittedAt: null,
    completedAt: null,
  });

  return docRef.id;
}

export async function getApproval(
  id: string
): Promise<ApprovalRequest | null> {
  const db = getAdminDb();
  const doc = await db.collection("approvals").doc(id).get();
  if (!doc.exists) return null;
  return docToApproval(doc);
}

export async function listApprovals(filters: {
  requesterUid?: string;
  approverUid?: string;
  ccUid?: string;
  status?: ApprovalStatus;
}): Promise<ApprovalRequest[]> {
  const db = getAdminDb();
  const query = db.collection("approvals").orderBy("createdAt", "desc");
  const snapshot = await query.get();
  let results = snapshot.docs.map(docToApproval);

  if (filters.requesterUid) {
    results = results.filter((a) => a.requester.uid === filters.requesterUid);
  }

  if (filters.status) {
    results = results.filter((a) => a.status === filters.status);
  }

  if (filters.approverUid) {
    results = results.filter((a) =>
      a.approvalLine.some((step) => step.approver.uid === filters.approverUid)
    );
  }

  if (filters.ccUid) {
    results = results.filter((a) =>
      a.ccList.some((cc) => cc.uid === filters.ccUid)
    );
  }

  return results;
}

export async function updateDraft(
  id: string,
  requesterUid: string,
  data: Partial<ApprovalFormData>
) {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc(id);
  const doc = await docRef.get();

  if (!doc.exists) throw new Error("결재 문서를 찾을 수 없습니다.");
  const d = doc.data()!;
  if (d.status !== "draft") throw new Error("임시저장 상태에서만 수정할 수 있습니다.");
  if (d.requester.uid !== requesterUid) throw new Error("기안자만 수정할 수 있습니다.");

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  if (data.isUrgent !== undefined) updates.isUrgent = data.isUrgent;
  if (data.attachments !== undefined) updates.attachments = data.attachments;
  if (data.ccList !== undefined) updates.ccList = data.ccList;
  if (data.approvers !== undefined) {
    updates.approvalLine = data.approvers.map((approver, i) => ({
      stepOrder: i + 1,
      approver,
      status: "waiting",
      comment: null,
      decidedAt: null,
    }));
  }

  await docRef.update(updates);
}

export async function deleteDraft(id: string, requesterUid: string) {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc(id);
  const doc = await docRef.get();

  if (!doc.exists) throw new Error("결재 문서를 찾을 수 없습니다.");
  const d = doc.data()!;
  if (d.status !== "draft") throw new Error("임시저장 상태에서만 삭제할 수 있습니다.");
  if (d.requester.uid !== requesterUid) throw new Error("기안자만 삭제할 수 있습니다.");

  await docRef.delete();
}

export async function submitApproval(id: string, requesterUid: string) {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc(id);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw new Error("결재 문서를 찾을 수 없습니다.");
    const d = doc.data()!;
    if (d.status !== "draft") throw new Error("임시저장 상태에서만 제출할 수 있습니다.");
    if (d.requester.uid !== requesterUid) throw new Error("기안자만 제출할 수 있습니다.");
    if (!d.approvalLine || d.approvalLine.length === 0) {
      throw new Error("승인자를 1명 이상 지정해야 합니다.");
    }

    const updatedLine = d.approvalLine.map(
      (step: Record<string, unknown>, i: number) => ({
        ...step,
        status: i === 0 ? "current" : "waiting",
      })
    );

    tx.update(docRef, {
      status: "pending",
      currentStep: 1,
      approvalLine: updatedLine,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function decideStep(
  id: string,
  approverUid: string,
  action: "approve" | "reject",
  comment?: string
) {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc(id);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw new Error("결재 문서를 찾을 수 없습니다.");
    const d = doc.data()!;

    if (d.status !== "pending" && d.status !== "in_progress") {
      throw new Error("결재 진행 중인 문서만 처리할 수 있습니다.");
    }

    const currentIdx = d.currentStep - 1;
    const currentStepData = d.approvalLine[currentIdx];

    let isDelegated = false;
    if (!currentStepData) {
      throw new Error("현재 결재 순서가 아닙니다.");
    }

    if (currentStepData.approver.uid !== approverUid) {
      const delegationDoc = await tx.get(
        db.collection("delegations").doc(currentStepData.approver.uid)
      );
      if (
        delegationDoc.exists &&
        delegationDoc.data()?.delegateTo?.uid === approverUid &&
        delegationDoc.data()?.isActive
      ) {
        isDelegated = true;
      } else {
        throw new Error("현재 결재 순서가 아닙니다.");
      }
    }

    const updatedLine = [...d.approvalLine];
    updatedLine[currentIdx] = {
      ...currentStepData,
      status: action === "approve" ? "approved" : "rejected",
      comment: comment || null,
      decidedAt: new Date().toISOString(),
      ...(isDelegated ? { delegatedBy: approverUid } : {}),
    };

    if (action === "reject") {
      tx.update(docRef, {
        status: "rejected",
        approvalLine: updatedLine,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const nextStep = d.currentStep + 1;
    const isLastStep = nextStep > d.approvalLine.length;

    if (isLastStep) {
      tx.update(docRef, {
        status: "approved",
        currentStep: d.currentStep,
        approvalLine: updatedLine,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      updatedLine[nextStep - 1] = {
        ...updatedLine[nextStep - 1],
        status: "current",
      };
      tx.update(docRef, {
        status: "in_progress",
        currentStep: nextStep,
        approvalLine: updatedLine,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

export async function cancelApproval(id: string, requesterUid: string) {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc(id);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw new Error("결재 문서를 찾을 수 없습니다.");
    const d = doc.data()!;
    if (d.requester.uid !== requesterUid) throw new Error("기안자만 취소할 수 있습니다.");
    if (d.status !== "pending" && d.status !== "in_progress") {
      throw new Error("진행 중인 결재만 취소할 수 있습니다.");
    }

    tx.update(docRef, {
      status: "canceled",
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function addComment(
  id: string,
  author: UserRef,
  text: string
) {
  const db = getAdminDb();
  const docRef = db.collection("approvals").doc(id);

  await docRef.update({
    comments: FieldValue.arrayUnion({
      id: crypto.randomUUID(),
      author,
      text,
      createdAt: new Date().toISOString(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
