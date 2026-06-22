import { getSession } from "@/lib/auth/session";
import { getApproval, updateDraft, deleteDraft, deleteApprovalAsAdmin } from "@/lib/firestore/approvals";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const approval = await getApproval(id);
  if (!approval) {
    return Response.json({ error: "결재 문서를 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json(approval);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    await updateDraft(id, session.uid, body);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "수정 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    if (session.role === "admin") {
      await deleteApprovalAsAdmin(id);
    } else {
      await deleteDraft(id, session.uid);
    }
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "삭제 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
