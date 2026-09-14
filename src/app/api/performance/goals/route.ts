import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import {
  GOALS_COLLECTION,
  SOURCE_ORDER,
  buildSeedGoals,
  parseTargets,
  parseNullableNumber,
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

/** 초기 시드 — 없는 목표는 새로 만들고, 있는 목표는 비어 있는 필드만 채운다 (기존 입력값은 덮어쓰지 않음) */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const db = getAdminDb();
  const seed = buildSeedGoals();
  const snaps = await db.getAll(...seed.map((g) => db.collection(GOALS_COLLECTION).doc(g.id)));
  const batch = db.batch();
  let created = 0;
  let filled = 0;

  seed.forEach((g, i) => {
    const ref = db.collection(GOALS_COLLECTION).doc(g.id);
    const snap = snaps[i];
    if (!snap.exists) {
      batch.set(ref, { ...g, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
      created++;
      return;
    }
    const data = snap.data() ?? {};
    const missing: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(g)) {
      if (!(key in data)) missing[key] = value;
    }
    if (Object.keys(missing).length > 0) {
      batch.update(ref, { ...missing, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
      filled++;
    }
  });

  if (created + filled > 0) await batch.commit();
  return Response.json({ success: true, created, filled });
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
  for (const key of ["annualTarget", "h1Actual"] as const) {
    if (key in updates) {
      const value = parseNullableNumber(updates[key]);
      if (value === undefined) return Response.json({ error: "숫자 형식이 올바르지 않습니다." }, { status: 400 });
      filtered[key] = value;
    }
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
