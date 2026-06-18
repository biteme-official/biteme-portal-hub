/**
 * 로컬(IP 화이트리스트된 머신)에서 실행하여 스마트스토어 데이터를 수집하고
 * 포털허브 push 엔드포인트에 업로드하는 스크립트.
 *
 * 실행: npx tsx scripts/push-smartstore.ts
 *
 * 환경변수 (로컬 .env.local 또는 직접 설정):
 *   NAVER_BITEME_CLIENT_ID
 *   NAVER_BITEME_CLIENT_SECRET
 *   KNOWLEDGE_PUSH_SECRET
 *   PORTAL_HUB_URL (기본값: https://biteme-portal-hub.vercel.app)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { collectAndSummarizeSmartstoreFromLocal } from "../src/lib/data-sources/smartstore-collector";

async function main() {
  const clientId = process.env.NAVER_BITEME_CLIENT_ID;
  const clientSecret = process.env.NAVER_BITEME_CLIENT_SECRET;
  const pushSecret = process.env.KNOWLEDGE_PUSH_SECRET;
  const portalUrl =
    process.env.PORTAL_HUB_URL || "https://biteme-portal-hub.vercel.app";

  if (!clientId || !clientSecret) {
    console.error(
      "NAVER_BITEME_CLIENT_ID, NAVER_BITEME_CLIENT_SECRET 환경변수가 필요합니다."
    );
    process.exit(1);
  }
  if (!pushSecret) {
    console.error("KNOWLEDGE_PUSH_SECRET 환경변수가 필요합니다.");
    process.exit(1);
  }

  console.log("스마트스토어 데이터 수집 중 (최근 30일)...");
  const summary = await collectAndSummarizeSmartstoreFromLocal(
    clientId,
    clientSecret,
    30
  );
  console.log(
    `수집 완료: ${summary.meta.recordCount}건, 매출 ₩${summary.kpis["총 매출(₩)"]?.toLocaleString()}`
  );

  console.log(`${portalUrl}/api/knowledge/push 에 업로드 중...`);
  const res = await fetch(`${portalUrl}/api/knowledge/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pushSecret}`,
    },
    body: JSON.stringify({ sourceId: "smartstore", summary }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`업로드 실패: ${res.status} ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log("업로드 성공:", result);
}

main().catch((e) => {
  console.error("오류:", e);
  process.exit(1);
});
