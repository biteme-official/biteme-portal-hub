import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ count: 0 });
  }

  const db = getAdminDb();
  const snapshot = await db
    .collection("approvals")
    .orderBy("createdAt", "desc")
    .get();

  const pending = snapshot.docs.filter((doc) => {
    const d = doc.data();
    if (d.status !== "pending" && d.status !== "in_progress") return false;
    const line = d.approvalLine || [];
    return line.some(
      (s: { approver: { uid: string }; status: string }) =>
        s.approver.uid === session.uid && s.status === "current"
    );
  });

  const items = pending.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title,
      isUrgent: d.isUrgent || false,
      requesterName: d.requester?.name || "",
      category: d.category || "기타",
      createdAt: d.createdAt?.toDate?.()?.toISOString() || "",
    };
  });

  return Response.json({ count: items.length, items });
}
