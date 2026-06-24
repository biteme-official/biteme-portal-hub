import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createSessionToken } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { notifyNewUserRegistered } from "@/lib/notifications/send";

const COOKIE_NAME = "session";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return Response.json({ error: "ID 토큰이 필요합니다." }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const decoded = await adminAuth.verifyIdToken(idToken);

    if (!decoded.email?.endsWith("@biteme.co.kr")) {
      return Response.json(
        { error: "바잇미 계정(@biteme.co.kr)만 이용 가능합니다." },
        { status: 403 }
      );
    }

    let userRef = adminDb.collection("users").doc(decoded.uid);
    let userDoc = await userRef.get();

    if (!userDoc.exists) {
      const byEmail = await adminDb
        .collection("users")
        .where("email", "==", decoded.email)
        .limit(1)
        .get();

      if (!byEmail.empty) {
        const oldDoc = byEmail.docs[0];
        const oldData = oldDoc.data();

        await userRef.set({
          ...oldData,
          uid: decoded.uid,
          photoURL: decoded.picture || oldData.photoURL || null,
          lastLoginAt: FieldValue.serverTimestamp(),
        });
        await oldDoc.ref.delete();
        userDoc = await userRef.get();
      } else {
        const usersSnapshot = await adminDb.collection("users").limit(1).get();
        const isFirstUser = usersSnapshot.empty;
        const newUserName = decoded.name || decoded.email!.split("@")[0];
        await userRef.set({
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
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: null,
        });
        userDoc = await userRef.get();

        if (!isFirstUser) {
          notifyNewUserRegistered(newUserName, decoded.email!, decoded.uid).catch((e) =>
            console.error("New user notification error:", e)
          );
        }
      }
    }

    const userData = userDoc.data()!;

    if (!userData.isActive) {
      const isPending = !userData.lastLoginAt;

      notifyNewUserRegistered(
        userData.name || decoded.name || decoded.email!.split("@")[0],
        decoded.email!,
        decoded.uid
      ).catch((e) => console.error("Inactive user notification error:", e));

      return Response.json(
        {
          error: isPending
            ? "관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다."
            : "비활성화된 계정입니다. 관리자에게 문의하세요.",
          pending: isPending,
        },
        { status: 403 }
      );
    }

    await userRef.update({ lastLoginAt: FieldValue.serverTimestamp() });

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
    return Response.json(
      { error: "인증에 실패했습니다.", detail: message },
      { status: 500 }
    );
  }
}
