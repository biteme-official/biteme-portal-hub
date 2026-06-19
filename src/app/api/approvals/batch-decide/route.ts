import { getSession } from "@/lib/auth/session";
import { decideStep, getApproval } from "@/lib/firestore/approvals";
import { notifyApprovalDecided } from "@/lib/notifications/send";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, action } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "결재 문서를 선택해주세요." }, { status: 400 });
  }
  if (action !== "approve") {
    return Response.json(
      { error: "일괄 처리는 승인만 가능합니다." },
      { status: 400 }
    );
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of ids) {
    try {
      await decideStep(id, session.uid, "approve");

      const approval = await getApproval(id);
      if (approval) {
        notifyApprovalDecided(
          id,
          approval.title,
          session.name,
          "approve",
          approval.requester.uid
        ).catch(() => {});
      }

      results.push({ id, ok: true });
    } catch (err) {
      results.push({
        id,
        ok: false,
        error: err instanceof Error ? err.message : "처리 실패",
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return Response.json({ succeeded, failed, results });
}
