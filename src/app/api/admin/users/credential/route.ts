import { getAdminAuth } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/kms/users";

const CREDENTIAL_DOMAIN = "@credential.biteme.co.kr";

async function verifyAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { loginId, password, name, division, department, position, role } =
    await request.json();

  if (!loginId || !password) {
    return Response.json(
      { error: "아이디와 비밀번호가 필요합니다." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return Response.json(
      { error: "비밀번호는 6자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const email = loginId.includes("@") ? loginId : `${loginId}${CREDENTIAL_DOMAIN}`;
  const auth = getAdminAuth();

  if (await findUserByEmail(email)) {
    return Response.json(
      { error: "이미 등록된 아이디입니다." },
      { status: 409 }
    );
  }

  try {
    const firebaseUser = await auth.createUser({
      email,
      password,
      displayName: name || loginId,
    });

    // 로그인 계정은 Firebase Auth, 직원 정보는 KMS
    await createUser({
      uid: firebaseUser.uid,
      email,
      loginId,
      name: name || loginId,
      photoURL: null,
      division: division || "",
      department: department || "",
      position: position || "",
      role: role || "member",
      isActive: true,
      authType: "credential",
      dashboardAccess: {},
    });

    return Response.json({ success: true, uid: firebaseUser.uid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("email-already-exists")) {
      return Response.json(
        { error: "이미 등록된 아이디입니다." },
        { status: 409 }
      );
    }
    console.error("Credential user creation error:", message);
    return Response.json(
      { error: "사용자 생성에 실패했습니다.", detail: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { uid, password } = await request.json();

  if (!uid || !password) {
    return Response.json(
      { error: "uid와 새 비밀번호가 필요합니다." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return Response.json(
      { error: "비밀번호는 6자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const auth = getAdminAuth();

  try {
    await auth.updateUser(uid, { password });
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Password reset error:", message);
    return Response.json(
      { error: "비밀번호 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
