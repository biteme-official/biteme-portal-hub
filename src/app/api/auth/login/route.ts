import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createSession } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";

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
    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 등록되지 않은 사용자 → 관리자 승인 필요
      // 단, users 컬렉션이 비어있으면(최초 사용자) 자동으로 admin 등록
      const usersSnapshot = await adminDb.collection("users").limit(1).get();
      if (usersSnapshot.empty) {
        await userRef.set({
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || decoded.email.split("@")[0],
          photoURL: decoded.picture || null,
          department: "",
          position: "",
          role: "admin",
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp(),
        });
      } else {
        return Response.json(
          { error: "등록되지 않은 사용자입니다. 관리자에게 등록을 요청하세요." },
          { status: 403 }
        );
      }
    }

    const freshDoc = userDoc.exists ? userDoc : await userRef.get();
    const userData = freshDoc.data()!;

    if (!userData.isActive) {
      return Response.json(
        { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
        { status: 403 }
      );
    }

    await userRef.update({ lastLoginAt: FieldValue.serverTimestamp() });

    await createSession({
      uid: decoded.uid,
      email: decoded.email!,
      name: decoded.name || decoded.email!.split("@")[0],
      photoURL: decoded.picture || null,
      role: (userData.role as "admin" | "member") || "member",
    });

    return Response.json({
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email!.split("@")[0],
      photoURL: decoded.picture || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Login error:", message, err);
    return Response.json(
      { error: "인증에 실패했습니다.", detail: message },
      { status: 500 }
    );
  }
}
