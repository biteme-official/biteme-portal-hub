import { getSession } from "@/lib/auth/session";
import { KmsError } from "@/lib/kms/client";
import { createUser, deleteUser, findUserByEmail, getUser, listUsers, updateUser, type PortalUserInput } from "@/lib/kms/users";

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

  // 등록일 최신순 (KMS)
  return Response.json(await listUsers());
}

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { email, name, division, department, position, role } = await request.json();

  if (!email?.endsWith("@biteme.co.kr")) {
    return Response.json(
      { error: "@biteme.co.kr 이메일만 등록 가능합니다." },
      { status: 400 }
    );
  }

  if (await findUserByEmail(email)) {
    return Response.json(
      { error: "이미 등록된 사용자입니다." },
      { status: 409 }
    );
  }

  // uid 는 KMS 가 만든다. 처음 구글 로그인할 때 구글 uid 로 옮겨진다
  const user = await createUser({
    email,
    name: name || email.split("@")[0],
    photoURL: null,
    division: division || "",
    department: department || "",
    position: position || "",
    role: role || "member",
    isActive: true,
  });

  return Response.json({ success: true, uid: user.uid });
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

  if (!(await getUser(uid))) {
    return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const allowed = ["name", "division", "department", "position", "role", "isActive", "dashboardAccess", "slackUserId"];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }

  try {
    await updateUser(uid, filtered as PortalUserInput);
  } catch (err) {
    const status = err instanceof KmsError && err.status < 500 ? 400 : 500;
    return Response.json({ error: err instanceof Error ? err.message : "수정 실패" }, { status });
  }
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { uid } = await request.json();

  if (!uid) {
    return Response.json({ error: "uid가 필요합니다." }, { status: 400 });
  }

  if (!(await getUser(uid))) {
    return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteUser(uid);
  return Response.json({ success: true });
}
