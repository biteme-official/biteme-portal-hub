import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { uid, archive } = await request.json();
  if (!uid || typeof archive !== "boolean") {
    return Response.json({ error: "uid와 archive(boolean)가 필요합니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  await userRef.update({
    isArchived: archive,
    isActive: archive ? false : userDoc.data()!.isActive,
  });

  return Response.json({ success: true, isArchived: archive });
}
