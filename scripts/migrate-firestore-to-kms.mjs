/**
 * Firestore(포털 결재·알림) → KMS 이관. Firestore 는 읽기만 한다.
 *
 * 실행 (포털 폴더에서):
 *   node --env-file=.env.local scripts/migrate-firestore-to-kms.mjs            # 건수만 확인 (쓰기 없음)
 *   node --env-file=.env.local scripts/migrate-firestore-to-kms.mjs --write    # KMS 에 쓰기
 *
 * 옵션: --notification-days=30 (알림은 최근 N일만, 기본 30)
 * 필요한 env: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY,
 *            KMS_API_URL (예: https://kms.biteme.co.kr/api/portal), KMS_API_TOKEN
 * 같은 데이터를 여러 번 보내도 결과가 같다 (KMS 가 문서 id 기준으로 덮어씀). 끊기면 다시 실행.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const daysArg = process.argv.find((a) => a.startsWith("--notification-days="));
const NOTIFICATION_DAYS = daysArg ? Number(daysArg.split("=")[1]) : 30;
const BATCH = 200;

for (const k of ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY", "KMS_API_URL", "KMS_API_TOKEN"]) {
  if (!process.env[k]) {
    console.error(`환경변수 ${k} 가 없습니다.`);
    process.exit(1);
  }
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

/** Firestore Timestamp 를 ISO 문자열로 (안쪽 배열·객체까지) */
function plain(v) {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

async function read(collection, query) {
  const snap = await (query ?? db.collection(collection)).get();
  return snap.docs.map((d) => ({ id: d.id, ...plain(d.data()) }));
}

async function send(kind, records) {
  let done = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const res = await fetch(`${process.env.KMS_API_URL.replace(/\/$/, "")}/import/${kind}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KMS_API_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: chunk }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${kind} ${i + 1}~${i + chunk.length}번째 실패 (${res.status}): ${body.slice(0, 300)}`);
    }
    done += chunk.length;
  }
  return done;
}

const since = new Date(Date.now() - NOTIFICATION_DAYS * 24 * 60 * 60 * 1000);

const users = await read("users");
const approvals = await read("approvals");
const templates = await read("approval_templates");
const delegations = (await read("delegations")).map((d) => ({ ...d, ownerUid: d.ownerUid || d.id }));
const notifications = await read(
  "notifications",
  db.collection("notifications").where("createdAt", ">=", Timestamp.fromDate(since))
);

console.log(`대상: ${WRITE ? "KMS 에 씀" : "확인만 (쓰기 없음)"} → ${process.env.KMS_API_URL}`);
console.log(`  직원 ${users.length}명, 결재 ${approvals.length}건, 양식 ${templates.length}건, 대결 ${delegations.length}건, 알림 ${notifications.length}건 (최근 ${NOTIFICATION_DAYS}일)`);

const byStatus = {};
for (const a of approvals) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
console.log("  결재 상태:", byStatus);

if (!WRITE) {
  console.log("쓰려면 --write 를 붙여 다시 실행하세요.");
  process.exit(0);
}

console.log("  결재", await send("approvals", approvals), "건 완료");
console.log("  양식", await send("templates", templates), "건 완료");
console.log("  대결", await send("delegations", delegations), "건 완료");
console.log("  알림", await send("notifications", notifications), "건 완료");
console.log("  직원", await send("users", users), "명 완료");
console.log("이관 끝.");
