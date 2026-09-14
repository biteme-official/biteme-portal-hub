import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import {
  GOALS_COLLECTION,
  SOURCE_ORDER,
  buildSeedGoals,
  parseTargets,
  type MetricSource,
} from "@/app/performance/metric-settings-data";

async function verifyAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const db = getAdminDb();
  const snapshot = await db.collection(GOALS_COLLECTION).orderBy("order", "asc").get();
  const goals = snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
  }));

  return Response.json(goals);
}

/** 초기 시드 — 컬렉션이 비어 있을 때만 실행 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const db = getAdminDb();
  const existing = await db.collection(GOALS_COLLECTION).limit(1).get();
  if (!existing.empty) {
    return Response.json({ error: "이미 목표가 등록되어 있습니다." }, { status: 409 });
  }

  const seed = buildSeedGoals();
  const batch = db.batch();
  for (const g of seed) {
    batch.set(db.collection(GOALS_COLLECTION).doc(g.id), {
      ...g,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.email,
    });
  }
  await batch.commit();

  return Response.json({ success: true, count: seed.length });
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { id, ...updates } = await request.json();
  if (!id) {
    return Response.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const filtered: Record<string, unknown> = {};

  if ("name" in updates) {
    const name = String(updates.name ?? "").trim();
    if (!name) return Response.json({ error: "목표 이름을 입력해주세요." }, { status: 400 });
    filtered.name = name;
  }
  if ("note" in updates) filtered.note = String(updates.note ?? "").trim();
  if ("sourceNote" in updates) filtered.sourceNote = String(updates.sourceNote ?? "").trim();
  if ("source" in updates) {
    if (!SOURCE_ORDER.includes(updates.source as MetricSource)) {
      return Response.json({ error: "알 수 없는 출처 라벨입니다." }, { status: 400 });
    }
    filtered.source = updates.source;
  }
  if ("targets" in updates) {
    const targets = parseTargets(updates.targets);
    if (!targets) return Response.json({ error: "목표값 형식이 올바르지 않습니다." }, { status: 400 });
    for (const [period, value] of Object.entries(targets)) filtered[`targets.${period}`] = value;
  }

  if (Object.keys(filtered).length === 0) {
    return Response.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection(GOALS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return Response.json({ error: "목표를 찾을 수 없습니다." }, { status: 404 });
  }

  await ref.update({ ...filtered, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  return Response.json({ success: true });
}
