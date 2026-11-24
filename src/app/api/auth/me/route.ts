import { getSession, deleteSession } from "@/lib/auth/session";
import { getUser, type PortalUser } from "@/lib/kms/users";

export async function GET() {
  const session = await getSession();

  if (!session || session.expiresAt < Date.now()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userData: PortalUser | null;
  try {
    userData = await getUser(session.uid);
  } catch (e) {
    // KMS 가 잠시 응답하지 않으면 로그인 세션 정보로 계속 쓴다 (로그아웃시키지 않음)
    console.error("auth/me: KMS 조회 실패, 세션 정보 사용", e);
    return Response.json({
      uid: session.uid,
      email: session.email,
      name: session.name,
      photoURL: session.photoURL,
      role: session.role,
      position: "",
    });
  }

  if (!userData || !userData.isActive) {
    await deleteSession();
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    uid: session.uid,
    email: session.email,
    name: userData.name || session.name,
    photoURL: userData.photoURL || session.photoURL,
    role: userData.role || session.role,
    position: userData.position || "",
  });
}
