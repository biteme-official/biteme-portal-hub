import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  if (!session || session.expiresAt < Date.now()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    uid: session.uid,
    email: session.email,
    name: session.name,
    photoURL: session.photoURL,
    role: session.role,
  });
}
