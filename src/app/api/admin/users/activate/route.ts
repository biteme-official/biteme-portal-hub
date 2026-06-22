import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { uid } = await request.json();
  if (!uid) {
    return Response.json({ error: "uid가 필요합니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const userData = userDoc.data()!;
  if (userData.isActive) {
    return Response.json({ error: "이미 활성화된 사용자입니다." }, { status: 400 });
  }

  await userRef.update({ isActive: true });

  return Response.json({
    success: true,
    name: userData.name,
    email: userData.email,
  });
}
