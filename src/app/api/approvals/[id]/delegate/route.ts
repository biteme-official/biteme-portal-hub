import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { delegateTo } = await request.json();
    if (!delegateTo?.uid || !delegateTo?.name) {
      return Response.json(
        { error: "위임 대상자 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("approvals").doc(id);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) throw new Error("결재 문서를 찾을 수 없습니다.");
      const d = doc.data()!;

      if (d.status !== "pending" && d.status !== "in_progress") {
        throw new Error("진행 중인 결재만 위임할 수 있습니다.");
      }

      const currentIdx = d.currentStep - 1;
      const currentStepData = d.approvalLine[currentIdx];

      if (!currentStepData || currentStepData.approver.uid !== session.uid) {
        throw new Error("현재 본인 결재 차례인 건만 위임할 수 있습니다.");
      }

      const updatedLine = [...d.approvalLine];
      updatedLine[currentIdx] = {
        ...currentStepData,
        approver: {
          uid: delegateTo.uid,
          name: delegateTo.name,
          email: delegateTo.email || "",
          department: delegateTo.department || "",
          photoURL: delegateTo.photoURL || null,
        },
        delegatedFrom: {
          uid: session.uid,
          name: session.name,
        },
      };

      tx.update(docRef, {
        approvalLine: updatedLine,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "위임 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
