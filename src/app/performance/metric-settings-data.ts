// 지표 설정(Firestore performance_metrics) 타입 + org-data 기반 초기 시드.
// 출처 라벨은 1차 분류안 — 관리자 화면에서 검토·수정한다.

import { PEOPLE, type MetricKind, type MetricUnit } from "./org-data";

export const METRICS_COLLECTION = "performance_metrics";

export type MetricSource = "auto" | "connectable" | "manual" | "action";
export type MetricCadence = "weekly" | "monthly" | "quarterly";

export const SOURCE_ORDER: MetricSource[] = ["auto", "connectable", "action", "manual"];
export const CADENCE_ORDER: MetricCadence[] = ["weekly", "monthly", "quarterly"];

export const SOURCE_LABEL: Record<MetricSource, string> = {
  auto: "자동 집계",
  connectable: "연동 가능",
  action: "액션 기반",
  manual: "수기",
};

export const CADENCE_LABEL: Record<MetricCadence, string> = {
  weekly: "주간",
  monthly: "월간",
  quarterly: "분기",
};

export interface MetricSetting {
  id: string;
  name: string;
  unit: MetricUnit;
  cadence: MetricCadence;
  source: MetricSource;
  /** 데이터 위치·산식 등 출처 메모 */
  sourceNote: string;
  ownerEmail: string;
  ownerName: string;
  division: string;
  team: string;
  scopes: string[];
  baseline: number | null;
  order: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

const CADENCE_BY_KIND: Record<MetricKind, MetricCadence> = {
  auto: "weekly",
  weekly: "weekly",
  monthly: "monthly",
  project: "quarterly",
};

const NEW_PRODUCT_SCHEDULE = { source: "connectable", sourceNote: "입고 데이터 + 신제품 목표일정표 — 8명 공통 지표" } as const;
const MARGIN_BAND = { source: "connectable", sourceNote: "원가 시트 + Tableau 판매가" } as const;
const LAUNCH_SKU = { source: "connectable", sourceNote: "상품 등록 데이터 vs 출시 계획" } as const;
const CS_PRODUCTIVITY = { source: "connectable", sourceNote: "채널톡 상담 처리량 — 상대점수 산식 확인 필요" } as const;

/** 수기 입력이던 지표(weekly/monthly/project)의 1차 분류. 나머지(auto)는 자동 집계. */
const INITIAL_SOURCE: Record<string, { source: MetricSource; sourceNote: string }> = {
  "donghoon-1": { source: "manual", sourceNote: "" },
  "donghoon-2": { source: "manual", sourceNote: "" },
  "donghoon-3": { source: "manual", sourceNote: "" },
  "donghoon-4": { source: "manual", sourceNote: "요청 트래킹 도구 도입 시 연동 가능" },
  "donghoon-5": { source: "manual", sourceNote: "요청 트래킹 도구 도입 시 연동 가능" },
  "suhyun-2": { source: "connectable", sourceNote: "Shopify / Amplitude" },
  "suhyun-3": { source: "connectable", sourceNote: "Shopify 주문" },
  "suhyun-4": { source: "manual", sourceNote: "총판 발주 데이터 위치 확인 필요" },
  "suhyun-5": { source: "manual", sourceNote: "" },
  "yeseon-1": { source: "action", sourceNote: "마감 액션 완료일로 준수 판정" },
  "yeseon-2": { source: "action", sourceNote: "마감 액션 완료일로 준수 판정" },
  "yeseon-3": { source: "manual", sourceNote: "" },
  "yeseon-4": { source: "manual", sourceNote: "" },
  "yeseon-5": { source: "action", sourceNote: "" },
  "kyunghwa-1": { source: "action", sourceNote: "마감 액션 완료일로 준수 판정" },
  "kyunghwa-2": { source: "action", sourceNote: "마감 액션 완료일로 준수 판정" },
  "kyunghwa-3": { source: "manual", sourceNote: "" },
  "kyunghwa-4": { source: "action", sourceNote: "" },
  "kyunghwa-5": { source: "action", sourceNote: "완료 액션 비율" },
  "hasun-5": { source: "action", sourceNote: "라이브 액션 완료 건수" },
  "jinha-5": { source: "manual", sourceNote: "" },
  "jinha-6": { source: "manual", sourceNote: "" },
  "jinha-7": { source: "connectable", sourceNote: "채널톡 상담 데이터" },
  "jinha-8": { source: "action", sourceNote: "" },
  "hyunjin-3": CS_PRODUCTIVITY,
  "jihyun-3": CS_PRODUCTIVITY,
  "geunhye-2": NEW_PRODUCT_SCHEDULE,
  "yejin-3": MARGIN_BAND,
  "yejin-4": MARGIN_BAND,
  "yejin-5": NEW_PRODUCT_SCHEDULE,
  "eunju-3": { source: "manual", sourceNote: "" },
  "eunju-4": { source: "manual", sourceNote: "" },
  "eunju-5": { source: "action", sourceNote: "" },
  "eunju-6": { source: "action", sourceNote: "" },
  "minki-3": NEW_PRODUCT_SCHEDULE,
  "yaejin-3": NEW_PRODUCT_SCHEDULE,
  "sohyun-3": NEW_PRODUCT_SCHEDULE,
  "minjung-3": NEW_PRODUCT_SCHEDULE,
  "minjung-4": LAUNCH_SKU,
  "seohee-3": NEW_PRODUCT_SCHEDULE,
  "sora-2": NEW_PRODUCT_SCHEDULE,
  "sora-3": LAUNCH_SKU,
  "inae-1": { source: "action", sourceNote: "완료 액션 건수" },
  "inae-2": { source: "action", sourceNote: "완료 액션 건수" },
};

export function buildSeedMetrics(): MetricSetting[] {
  let order = 0;
  return PEOPLE.flatMap((p) =>
    p.metrics.map((m) => {
      const initial = m.kind === "auto"
        ? { source: "auto" as const, sourceNote: "" }
        : INITIAL_SOURCE[m.id] ?? { source: "manual" as const, sourceNote: "" };
      return {
        id: m.id,
        name: m.name,
        unit: m.unit,
        cadence: CADENCE_BY_KIND[m.kind],
        source: initial.source,
        sourceNote: initial.sourceNote,
        ownerEmail: p.email,
        ownerName: p.name,
        division: p.division,
        team: p.team,
        scopes: m.scopes ?? [],
        baseline: m.baseline,
        order: order++,
      };
    })
  );
}
