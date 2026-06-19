import { getAdminDb } from "@/lib/firebase/admin";
import { sendSlackReminders } from "@/lib/notifications/slack";
import { dispatchNotification } from "@/lib/notifications/send";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getAdminDb();
  const snapshot = await db
    .collection("approvals")
    .orderBy("createdAt", "desc")
    .get();

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const delayed: {
    id: string;
    title: string;
    requesterName: string;
    daysSince: number;
    currentApproverUid: string;
    currentApproverEmail: string;
  }[] = [];

  for (const doc of snapshot.docs) {
    const d = doc.data();
    if (d.status !== "pending" && d.status !== "in_progress") continue;

    const submittedAt =
      d.submittedAt?.toDate?.()?.getTime() ||
      d.createdAt?.toDate?.()?.getTime();
    if (!submittedAt) continue;

    const daysSince = Math.floor((now - submittedAt) / ONE_DAY);
    if (daysSince < 1) continue;

    const currentStep = (d.approvalLine || []).find(
      (s: { status: string }) => s.status === "current"
    );
    if (!currentStep) continue;

    delayed.push({
      id: doc.id,
      title: d.title,
      requesterName: d.requester?.name || "",
      daysSince,
      currentApproverUid: currentStep.approver.uid,
      currentApproverEmail: currentStep.approver.email,
    });
  }

  if (delayed.length > 0) {
    sendSlackReminders(
      delayed.map((d) => ({
        id: d.id,
        title: d.title,
        requesterName: d.requesterName,
        daysSince: d.daysSince,
        approverEmail: d.currentApproverEmail,
      }))
    ).catch((e) => console.error("Slack reminder error:", e));

    for (const item of delayed) {
      await dispatchNotification({
        recipientUids: [item.currentApproverUid],
        type: "approval_reminder",
        title: "미결재 알림",
        body: `"${item.title}" 결재가 ${item.daysSince}일째 대기 중입니다.`,
        approvalId: item.id,
        approvalTitle: item.title,
      });
    }
  }

  return Response.json({
    ok: true,
    delayed: delayed.length,
    items: delayed.map((d) => ({
      id: d.id,
      title: d.title,
      days: d.daysSince,
    })),
  });
}
