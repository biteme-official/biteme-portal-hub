import { getUser, updateUser } from "@/lib/kms/users";
import { getSession } from "@/lib/auth/session";
import { sendUserApprovedDm } from "@/lib/notifications/slack";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { uid } = await request.json();
  if (!uid) {
    return Response.json({ error: "uid가 필요합니다." }, { status: 400 });
  }

  const userData = await getUser(uid);

  if (!userData) {
    return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (userData.isActive) {
    return Response.json({ error: "이미 활성화된 사용자입니다." }, { status: 400 });
  }

  await updateUser(uid, { isActive: true });

  await sendUserApprovedDm(userData.email, userData.name).catch((e) =>
    console.error("Approved DM error:", e)
  );

  return Response.json({
    success: true,
    name: userData.name,
    email: userData.email,
  });
}
