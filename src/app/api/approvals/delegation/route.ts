import { getSession } from "@/lib/auth/session";
import { kms } from "@/lib/kms/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 끝난 위임은 KMS 가 null 로 돌려준다
  const res = await kms<{ delegation: unknown }>("/delegation", { actorUid: session.uid });
  return Response.json({ delegation: res.delegation });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { delegateTo, startDate, endDate, reason } = await request.json();

  if (!delegateTo?.uid) {
    return Response.json({ error: "대리 결재자를 지정해주세요." }, { status: 400 });
  }
  if (delegateTo.uid === session.uid) {
    return Response.json({ error: "본인에게 위임할 수 없습니다." }, { status: 400 });
  }

  try {
    await kms("/delegation", {
      method: "PUT",
      actorUid: session.uid,
      body: {
        ownerName: session.name,
        delegateTo,
        startDate: startDate || null,
        endDate: endDate || null,
        reason: reason || "",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장 실패";
    return Response.json({ error: message }, { status: 400 });
  }

  return Response.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await kms("/delegation", { method: "DELETE", actorUid: session.uid });

  return Response.json({ success: true });
}
