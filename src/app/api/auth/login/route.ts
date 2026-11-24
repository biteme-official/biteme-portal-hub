import { getAdminAuth } from "@/lib/firebase/admin";
import { createSessionToken } from "@/lib/auth/session";
import { createUser, findUserByEmail, getUser, listUsers, moveUser, touchLogin } from "@/lib/kms/users";
import { NextResponse } from "next/server";
import { notifyNewUserRegistered } from "@/lib/notifications/send";

const COOKIE_NAME = "session";

async function verifyCredentialLogin(
  email: string,
  password: string,
  apiKey: string
): Promise<{ uid: string; email: string }> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    const code = err?.error?.message || "";
    console.error("Firebase auth error:", JSON.stringify(err));
    if (code === "EMAIL_NOT_FOUND" || code === "INVALID_LOGIN_CREDENTIALS") {
      throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
      throw new Error(
        "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요."
      );
    }
    if (
      code === "ADMIN_ONLY_OPERATION" ||
      code === "PASSWORD_LOGIN_DISABLED" ||
      code.includes("CONFIGURATION_NOT_FOUND")
    ) {
      throw new Error("이메일/비밀번호 로그인이 활성화되지 않았습니다. Firebase Console에서 활성화하세요.");
    }
    throw new Error("인증에 실패했습니다.");
  }

  const data = await res.json();
  return { uid: data.localId, email: data.email };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, loginId, password } = body;

    if (!idToken && (!loginId || !password)) {
      return Response.json(
        { error: "인증 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const credEmail = loginId
      ? loginId.includes("@") ? loginId : `${loginId}@credential.biteme.co.kr`
      : undefined;

    const adminAuth = getAdminAuth();

    let decoded: { uid: string; email?: string; name?: string; picture?: string };
    let isCredentialLogin = false;

    if (idToken) {
      decoded = await adminAuth.verifyIdToken(idToken);

      if (!decoded.email?.endsWith("@biteme.co.kr")) {
        return Response.json(
          { error: "바잇미 계정(@biteme.co.kr)만 이용 가능합니다." },
          { status: 403 }
        );
      }
    } else {
      const apiKey =
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        "AIzaSyBRU_YtrDVWEF4TvckKadj4B9wa33ak3K4";

      const result = await verifyCredentialLogin(credEmail!, password, apiKey);
      decoded = { uid: result.uid, email: result.email };
      isCredentialLogin = true;

      const credentialUser = await getUser(decoded.uid);
      if (!credentialUser || credentialUser.authType !== "credential") {
        return Response.json(
          { error: "예외 로그인 계정이 아닙니다. 구글 로그인을 이용하세요." },
          { status: 403 }
        );
      }
    }

    // 직원 정보·권한은 KMS (Firebase 는 로그인 확인만)
    let userData = await getUser(decoded.uid);

    if (!userData) {
      const byEmail = await findUserByEmail(decoded.email!);

      if (byEmail) {
        // 관리자가 미리 등록한 직원의 첫 로그인: 기존 정보를 구글 uid 로 옮김
        userData = await moveUser(byEmail.uid, decoded.uid, decoded.picture || byEmail.photoURL || null);
      } else {
        const isFirstUser = (await listUsers()).length === 0;
        const newUserName = decoded.name || decoded.email!.split("@")[0];
        userData = await createUser({
          uid: decoded.uid,
          email: decoded.email!,
          name: newUserName,
          photoURL: decoded.picture || null,
          division: "",
          department: "",
          position: "",
          role: isFirstUser ? "admin" : "member",
          isActive: isFirstUser,
          dashboardAccess: {},
        });

        // Notification is handled in the !isActive block below with proper guards
      }
    }

    if (!userData.isActive) {
      const isPending = !userData.lastLoginAt;
      const isArchived = !!userData.isArchived;
      console.log(`Login blocked: ${decoded.email}, isPending=${isPending}, isArchived=${isArchived}`);

      if (!isArchived) {
        console.log(`Sending new user notification for ${decoded.email}`);
        await notifyNewUserRegistered(
          userData.name || decoded.name || decoded.email!.split("@")[0],
          decoded.email!,
          decoded.uid
        ).catch((e) => console.error("Inactive user notification error:", e));
      }

      return Response.json(
        {
          error: isArchived
            ? "보관된 계정입니다. 관리자에게 문의하세요."
            : isPending
              ? "관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다."
              : "비활성화된 계정입니다. 관리자에게 문의하세요.",
          pending: isPending,
        },
        { status: 403 }
      );
    }

    await touchLogin(decoded.uid);

    const { token, expiresAt } = await createSessionToken({
      uid: decoded.uid,
      email: decoded.email!,
      name: userData.name || decoded.name || decoded.email!.split("@")[0],
      photoURL: decoded.picture || userData.photoURL || null,
      role: (userData.role as "admin" | "member") || "member",
    });

    const response = NextResponse.json({
      uid: decoded.uid,
      email: decoded.email,
      name: userData.name || decoded.name || decoded.email!.split("@")[0],
      photoURL: decoded.picture || null,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Login error:", message, err);

    const isUserFacing =
      message.includes("비밀번호") ||
      message.includes("아이디") ||
      message.includes("시도가 너무") ||
      message.includes("예외 로그인") ||
      message.includes("활성화");

    return Response.json(
      { error: isUserFacing ? message : "인증에 실패했습니다." },
      { status: isUserFacing ? 401 : 500 }
    );
  }
}
