import { getSession } from "@/lib/auth/session";
import { delegateStep } from "@/lib/firestore/approvals";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { delegateTo } = await request.json();
    if (!delegateTo?.uid || !delegateTo?.name) {
      return Response.json(
        { error: "위임 대상자 정보가 필요합니다." },
        { status: 400 }
      );
    }

    await delegateStep(id, { uid: session.uid, name: session.name }, {
      uid: delegateTo.uid,
      name: delegateTo.name,
      email: delegateTo.email || "",
      department: delegateTo.department || "",
      photoURL: delegateTo.photoURL || null,
    });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "위임 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
