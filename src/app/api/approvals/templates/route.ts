import { getSession } from "@/lib/auth/session";
import { kms } from "@/lib/kms/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await kms("/templates", { actorUid: session.uid });
  return Response.json(templates);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, approvers, ccList, category } = await request.json();

  if (!name?.trim()) {
    return Response.json({ error: "템플릿 이름을 입력해주세요." }, { status: 400 });
  }
  if (!approvers?.length) {
    return Response.json({ error: "결재자를 1명 이상 지정해주세요." }, { status: 400 });
  }

  try {
    const res = await kms<{ id: string }>("/templates", {
      method: "POST",
      actorUid: session.uid,
      body: { name: name.trim(), approvers, ccList: ccList || [], category: category || "기타" },
    });
    return Response.json({ id: res.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  try {
    await kms(`/templates/${encodeURIComponent(id)}`, { method: "DELETE", actorUid: session.uid });
  } catch {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return Response.json({ success: true });
}
