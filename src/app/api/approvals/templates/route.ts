import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snapshot = await db
    .collection("approval_templates")
    .where("ownerUid", "==", session.uid)
    .orderBy("createdAt", "desc")
    .get();

  const templates = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || "",
  }));

  return Response.json(templates);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, approvers, ccList, category } = await request.json();

  if (!name?.trim()) {
    return Response.json({ error: "템플릿 이름을 입력해주세요." }, { status: 400 });
  }
  if (!approvers?.length) {
    return Response.json({ error: "결재자를 1명 이상 지정해주세요." }, { status: 400 });
  }

  const db = getAdminDb();
  const docRef = db.collection("approval_templates").doc();
  await docRef.set({
    ownerUid: session.uid,
    name: name.trim(),
    approvers,
    ccList: ccList || [],
    category: category || "기타",
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ id: docRef.id });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  const db = getAdminDb();
  const doc = await db.collection("approval_templates").doc(id).get();

  if (!doc.exists || doc.data()?.ownerUid !== session.uid) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await db.collection("approval_templates").doc(id).delete();
  return Response.json({ success: true });
}
