import { getSession } from "@/lib/auth/session";
import { submitApproval, getApproval } from "@/lib/firestore/approvals";
import { notifyApprovalSubmitted } from "@/lib/notifications/send";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await submitApproval(id, session.uid);

    const approval = await getApproval(id);
    if (approval) {
      const approverUids = approval.approvalLine.map((s) => s.approver.uid);
      const ccUids = approval.ccList.map((c) => c.uid);
      notifyApprovalSubmitted(
        id,
        approval.title,
        session.name,
        approverUids,
        ccUids
      ).catch((e) => console.error("Notification error:", e));
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "제출 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
