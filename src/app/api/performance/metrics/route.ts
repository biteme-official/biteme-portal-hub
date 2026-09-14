import { getAdminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import { PEOPLE } from "@/app/performance/org-data";
import {
  METRICS_COLLECTION,
  SOURCE_ORDER,
  CADENCE_ORDER,
  buildSeedMetrics,
  type MetricSource,
  type MetricCadence,
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
  const snapshot = await db.collection(METRICS_COLLECTION).orderBy("order", "asc").get();
  const metrics = snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
  }));

  return Response.json(metrics);
}

/** 초기 시드 — 컬렉션이 비어 있을 때만 실행 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const db = getAdminDb();
  const existing = await db.collection(METRICS_COLLECTION).limit(1).get();
  if (!existing.empty) {
    return Response.json({ error: "이미 지표가 등록되어 있습니다." }, { status: 409 });
  }

  const seed = buildSeedMetrics();
  const batch = db.batch();
  for (const m of seed) {
    batch.set(db.collection(METRICS_COLLECTION).doc(m.id), {
      ...m,
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
    if (!name) return Response.json({ error: "지표 이름을 입력해주세요." }, { status: 400 });
    filtered.name = name;
  }
  if ("sourceNote" in updates) {
    filtered.sourceNote = String(updates.sourceNote ?? "").trim();
  }
  if ("source" in updates) {
    if (!SOURCE_ORDER.includes(updates.source as MetricSource)) {
      return Response.json({ error: "알 수 없는 출처 라벨입니다." }, { status: 400 });
    }
    filtered.source = updates.source;
  }
  if ("cadence" in updates) {
    if (!CADENCE_ORDER.includes(updates.cadence as MetricCadence)) {
      return Response.json({ error: "알 수 없는 주기입니다." }, { status: 400 });
    }
    filtered.cadence = updates.cadence;
  }
  if ("ownerEmail" in updates) {
    const owner = PEOPLE.find((p) => p.email === updates.ownerEmail);
    if (!owner) return Response.json({ error: "담당자를 찾을 수 없습니다." }, { status: 400 });
    filtered.ownerEmail = owner.email;
    filtered.ownerName = owner.name;
    filtered.division = owner.division;
    filtered.team = owner.team;
  }

  if (Object.keys(filtered).length === 0) {
    return Response.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection(METRICS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return Response.json({ error: "지표를 찾을 수 없습니다." }, { status: 404 });
  }

  await ref.update({ ...filtered, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  return Response.json({ success: true });
}
