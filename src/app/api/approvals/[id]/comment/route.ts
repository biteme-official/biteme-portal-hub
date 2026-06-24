import { getSession } from "@/lib/auth/session";
import { addComment, getApproval } from "@/lib/firestore/approvals";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyComment } from "@/lib/notifications/send";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return Response.json({ error: "코멘트를 입력해주세요." }, { status: 400 });
    }

    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(session.uid).get();
    const userData = userDoc.data();

    const author = {
      uid: session.uid,
      name: session.name,
      email: session.email,
      department: userData?.department || "",
      photoURL: session.photoURL,
    };

    await addComment(id, author, text.trim());

    const approval = await getApproval(id);
    if (approval) {
      const recipientUids = new Set<string>();
      recipientUids.add(approval.requester.uid);
      approval.approvalLine.forEach((s) => recipientUids.add(s.approver.uid));
      approval.ccList.forEach((c) => recipientUids.add(c.uid));
      recipientUids.delete(session.uid);

      if (recipientUids.size > 0) {
        await notifyComment(
          id,
          approval.title,
          session.name,
          Array.from(recipientUids)
        ).catch((e) => console.error("Notification error:", e));
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "코멘트 추가 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
