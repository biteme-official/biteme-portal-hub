import { getSession } from "@/lib/auth/session";
import { listPendingForMe } from "@/lib/firestore/approvals";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ count: 0 });
  }

  // KMS 가 "지금 결재할 사람" 칸으로 바로 센다 (결재 전체를 읽지 않음)
  const { count, items } = await listPendingForMe(session.uid);
  return Response.json({ count, items });
}
