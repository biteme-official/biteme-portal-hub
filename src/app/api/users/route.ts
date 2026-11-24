import { getSession } from "@/lib/auth/session";
import { listUsers } from "@/lib/kms/users";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const users = (await listUsers({ active: true })).map((d) => ({
    uid: d.uid,
    name: d.name,
    email: d.email,
    department: d.department || "",
    photoURL: d.photoURL || null,
    position: d.position || "",
  }));

  return Response.json(users);
}
