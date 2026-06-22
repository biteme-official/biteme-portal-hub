import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createSessionToken } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

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
        if (usersSnapshot.empty) {
          await userRef.set({
            uid: decoded.uid,
            email: decoded.email,
            name: decoded.name || decoded.email.split("@")[0],
            photoURL: decoded.picture || null,
            division: "",
            department: "",
            position: "",
            role: "admin",
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
          });
          userDoc = await userRef.get();
        } else {
          return Response.json(
            { error: "등록되지 않은 사용자입니다. 관리자에게 등록을 요청하세요." },
            { status: 403 }
          );
        }
      }
    }

    const userData = userDoc.data()!;

    if (!userData.isActive) {
      return Response.json(
        { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
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
