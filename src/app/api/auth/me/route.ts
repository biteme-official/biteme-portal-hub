import { getSession, deleteSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = await getSession();

  if (!session || session.expiresAt < Date.now()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(session.uid).get();

  if (!userDoc.exists || !userDoc.data()?.isActive) {
    await deleteSession();
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userData = userDoc.data()!;
  return Response.json({
    uid: session.uid,
    email: session.email,
    name: userData.name || session.name,
    photoURL: userData.photoURL || session.photoURL,
    role: userData.role || session.role,
    position: userData.position || "",
  });
}
