import { getSession } from "@/lib/auth/session";
import { kms } from "@/lib/kms/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 최신 50건 + 안 읽은 수 (KMS)
  const res = await kms<{ notifications: unknown[]; unreadCount: number }>("/notifications", {
    actorUid: session.uid,
  });
  return Response.json(res);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, markAll } = await request.json();

  if (markAll || ids?.length) {
    await kms("/notifications/read", {
      method: "POST",
      actorUid: session.uid,
      body: markAll ? { markAll: true } : { ids },
    });
  }

  return Response.json({ success: true });
}
