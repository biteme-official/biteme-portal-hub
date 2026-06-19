import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const doc = await db.collection("delegations").doc(session.uid).get();

  if (!doc.exists) {
    return Response.json({ delegation: null });
  }

  const d = doc.data()!;
  const now = new Date();
  const endDate = d.endDate ? new Date(d.endDate) : null;

  if (endDate && endDate < now) {
    return Response.json({ delegation: null });
  }

  return Response.json({ delegation: d });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { delegateTo, startDate, endDate, reason } = await request.json();

  if (!delegateTo?.uid) {
    return Response.json({ error: "대리 결재자를 지정해주세요." }, { status: 400 });
  }
  if (delegateTo.uid === session.uid) {
    return Response.json({ error: "본인에게 위임할 수 없습니다." }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("delegations").doc(session.uid).set({
    ownerUid: session.uid,
    ownerName: session.name,
    delegateTo,
    startDate: startDate || new Date().toISOString().split("T")[0],
    endDate: endDate || null,
    reason: reason || "",
    isActive: true,
  });

  return Response.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  await db.collection("delegations").doc(session.uid).delete();

  return Response.json({ success: true });
}
