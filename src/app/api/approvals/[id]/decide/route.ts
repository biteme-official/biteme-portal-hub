import { getSession } from "@/lib/auth/session";
import { decideStep, getApproval } from "@/lib/firestore/approvals";
import { notifyApprovalDecided } from "@/lib/notifications/send";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { action, comment, selectedOption, yesNoVote } = await request.json();

    if (action !== "approve" && action !== "reject") {
      return Response.json({ error: "action은 approve 또는 reject만 가능합니다." }, { status: 400 });
    }

    if (action === "reject" && !comment?.trim()) {
      return Response.json({ error: "반려 시 사유를 입력해야 합니다." }, { status: 400 });
    }

    const vote = {
      ...(selectedOption !== undefined ? { selectedOption } : {}),
      ...(yesNoVote !== undefined ? { yesNoVote } : {}),
    };

    await decideStep(id, session.uid, action, comment, vote);

    const approval = await getApproval(id);
    if (approval) {
      notifyApprovalDecided(
        id,
        approval.title,
        session.name,
        action,
        approval.requester.uid,
        comment
      ).catch((e) => console.error("Notification error:", e));
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "처리 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
