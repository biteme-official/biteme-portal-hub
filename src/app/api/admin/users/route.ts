import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";

async function verifyAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const db = getAdminDb();
  const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
  const users = snapshot.docs.map((doc) => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString() || null,
  }));

  return Response.json(users);
}

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { email, name, department, position, role } = await request.json();

  if (!email?.endsWith("@biteme.co.kr")) {
    return Response.json(
      { error: "@biteme.co.kr 이메일만 등록 가능합니다." },
      { status: 400 }
    );
  }

  const db = getAdminDb();

  const existing = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) {
    return Response.json(
      { error: "이미 등록된 사용자입니다." },
      { status: 409 }
    );
  }

  const docRef = db.collection("users").doc();
  await docRef.set({
    uid: docRef.id,
    email,
    name: name || email.split("@")[0],
    photoURL: null,
    department: department || "",
    position: position || "",
    role: role || "member",
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: null,
  });

  return Response.json({ success: true, uid: docRef.id });
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { uid, ...updates } = await request.json();

  if (!uid) {
    return Response.json({ error: "uid가 필요합니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const allowed = ["name", "department", "position", "role", "isActive"];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }

  await userRef.update(filtered);
  return Response.json({ success: true });
}
