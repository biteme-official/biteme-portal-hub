import { getSession } from "@/lib/auth/session";
import { createApproval, listApprovals } from "@/lib/firestore/approvals";
import { getAdminDb } from "@/lib/firebase/admin";
import type { ApprovalStatus } from "@/lib/types/approval";

async function getRequester(uid: string) {
  const db = getAdminDb();
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    uid: d.uid,
    name: d.name,
    email: d.email,
    department: d.department || "",
    photoURL: d.photoURL || null,
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status") as ApprovalStatus | null;

  const filters: {
    requesterUid?: string;
    approverUid?: string;
    ccUid?: string;
    status?: ApprovalStatus;
  } = {};

  if (type === "my-requests") filters.requesterUid = session.uid;
  if (type === "my-approvals") filters.approverUid = session.uid;
  if (type === "cc") filters.ccUid = session.uid;
  if (status) filters.status = status;

  const approvals = await listApprovals(filters);
  return Response.json(approvals);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const requester = await getRequester(session.uid);
    if (!requester) {
      return Response.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const id = await createApproval(body, requester);
    return Response.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "생성 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
