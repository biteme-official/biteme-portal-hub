import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getDashboardBySlug } from "@/lib/dashboards";
import { SignJWT } from "jose";

const SECRET_KEY = process.env.SESSION_SECRET!;
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await request.json();
  if (!slug)
    return Response.json({ error: "slug is required" }, { status: 400 });

  const dashboard = getDashboardBySlug(slug);
  const hasRoles = dashboard?.roles && dashboard.roles.length > 0;

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(session.uid).get();
  const userData = userDoc.data();
  const access: Record<string, string> = userData?.dashboardAccess || {};

  const ROLE_MIGRATION: Record<string, string> = { marketing: "viewer", cs: "viewer" };
  const rawRole = access[slug];
  const dashboardRole = rawRole ? (ROLE_MIGRATION[rawRole] || rawRole) : undefined;

  if (hasRoles && userData?.role !== "admin" && !dashboardRole) {
    return Response.json(
      { error: "해당 대시보드에 접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  const token = await new SignJWT({
    uid: session.uid,
    email: session.email,
    name: session.name,
    slug,
    dashboardRole: dashboardRole || (hasRoles ? "admin" : "viewer"),
    type: "iframe",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(encodedKey);

  return Response.json({ token });
}
