import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  let snapshot;
  try {
    snapshot = await db
      .collection("notifications")
      .where("recipientUid", "==", session.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
  } catch (e: unknown) {
    const code = (e as { code?: number }).code;
    if (code === 9) {
      snapshot = await db
        .collection("notifications")
        .where("recipientUid", "==", session.uid)
        .limit(50)
        .get();
    } else {
      throw e;
    }
  }

  const notifications = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      recipientUid: d.recipientUid,
      type: d.type,
      title: d.title,
      body: d.body,
      approvalId: d.approvalId || "",
      approvalTitle: d.approvalTitle || "",
      linkUrl: d.linkUrl || "",
      targetUserUid: d.targetUserUid || "",
      isRead: d.isRead || false,
      createdAt: d.createdAt?.toDate?.()?.toISOString() || "",
    };
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return Response.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, markAll } = await request.json();
  const db = getAdminDb();

  if (markAll) {
    const snapshot = await db
      .collection("notifications")
      .where("recipientUid", "==", session.uid)
      .where("isRead", "==", false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
  } else if (ids?.length) {
    const batch = db.batch();
    for (const id of ids) {
      const ref = db.collection("notifications").doc(id);
      batch.update(ref, { isRead: true });
    }
    await batch.commit();
  }

  return Response.json({ success: true });
}
