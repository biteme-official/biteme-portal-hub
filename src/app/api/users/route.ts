import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const snapshot = await db
    .collection("users")
    .where("isActive", "==", true)
    .get();

  const users = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      uid: d.uid,
      name: d.name,
      email: d.email,
      department: d.department || "",
      photoURL: d.photoURL || null,
      position: d.position || "",
    };
  });

  return Response.json(users);
}
