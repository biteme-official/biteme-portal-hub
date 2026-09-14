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

export const GOALS_COLLECTION = "performance_goals";

export const PERIODS = ["2026Q3", "2026Q4"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABEL: Record<Period, string> = { "2026Q3": "26년 3Q", "2026Q4": "26년 4Q" };

/** 분기별 목표값. null = 미확정 */
export type Targets = Partial<Record<Period, number | null>>;

export type GoalLevel = "company" | "division" | "team";
export const GOAL_LEVEL_LABEL: Record<GoalLevel, string> = { company: "전사", division: "본부", team: "팀" };

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
  /** 연결된 상위 목표(팀 KPI) — 없으면 담당 팀 기본 KPI */
  parentGoalId?: string | null;
  targets?: Targets;
  order: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface GoalSetting {
  id: string;
  level: GoalLevel;
  name: string;
  division: string | null;
  team: string | null;
  parentId: string | null;
  unit: MetricUnit;
  source: MetricSource;
  sourceNote: string;
  /** 분기별 목표 (분기 단독 금액). 누적은 상반기 실적 + 분기 합으로 계산 */
  targets: Targets;
  /** 전사·본부: 연간 목표 */
  annualTarget?: number | null;
  /** 전사·본부: 상반기 실적 (누적 시작점) */
  h1Actual?: number | null;
  /** 근거·확정 필요 사항 */
  note: string;
  order: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/** number | null 검증. 잘못된 값이면 undefined */
export function parseNullableNumber(v: unknown): number | null | undefined {
  if (v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

/** 요청 body의 targets를 검증해 { period: number|null } 로 정리. 잘못된 값이면 null 반환 */
export function parseTargets(raw: unknown): Targets | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Targets = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!PERIODS.includes(k as Period)) return null;
    if (v === null || v === "") out[k as Period] = null;
    else if (typeof v === "number" && Number.isFinite(v)) out[k as Period] = v;
    else return null;
  }
  return out;
}

export function teamGoalId(team: string): string {
  return `team:${team}`;
}

const EOK = 100000000;

/** H2 KPI 재설계(2026-08-13) 기준 초기 목표. 사업부별 배분이 미확정이라 본부·팀 목표값은 비워 둔다. */
export function buildSeedGoals(): GoalSetting[] {
  const goals: Omit<GoalSetting, "order">[] = [
    {
      id: "company:revenue", level: "company", name: "전사 매출", division: null, team: null, parentId: null,
      unit: "currency", source: "connectable", sourceNote: "국내 2026 SUMMARY 시트 + 인케어 매출 시트 (KPI 시트 동기화 로직 재사용)",
      targets: { "2026Q3": 52 * EOK, "2026Q4": 61 * EOK }, annualTarget: 200 * EOK, h1Actual: 87.8 * EOK,
      note: "전사 마일스톤: Q1 39.7억 · Q2 48.1억 (실적) · Q3 52억 · Q4 61억",
    },
    {
      id: "company:op", level: "company", name: "전사 영업이익", division: null, team: null, parentId: null,
      unit: "currency", source: "connectable", sourceNote: "국내 공헌이익 − 고정비 일할(월 2.2억)",
      targets: { "2026Q3": 4 * EOK, "2026Q4": 5 * EOK }, annualTarget: 20 * EOK, h1Actual: 11.7 * EOK,
      note: "전사 마일스톤: Q1 6억 · Q2 5.7억 (실적) · Q3 4억 · Q4 5억",
    },
    {
      id: "division:CEO본부", level: "division", name: "글로벌 매출 (해외팀 + 인케어)", division: "CEO본부", team: null, parentId: "company:revenue",
      unit: "currency", source: "connectable", sourceNote: "국내 해외사업부 + 일본 인케어(9.4원/엔)",
      targets: {}, annualTarget: null, h1Actual: null, note: "H1 연간목표 글로벌 25억 + 인케어 30억 — H2 배분 확정 필요",
    },
    {
      id: "division:COO본부", level: "division", name: "브랜드 공헌이익 · 운영 효율", division: "COO본부", team: null, parentId: "company:op",
      unit: "currency", source: "connectable", sourceNote: "Tableau SKU 공헌이익",
      targets: {}, annualTarget: null, h1Actual: null, note: "H2 브랜드만 이익목표 유지(H1 매출 110억 · OP 9억). 경영지원·CS는 운영 지표 — 본부 KPI 정의 확인 필요",
    },
    {
      id: "division:CPO본부", level: "division", name: "제품(PB) 공헌이익", division: "CPO본부", team: null, parentId: "company:op",
      unit: "currency", source: "connectable", sourceNote: "Tableau 카테고리별 공헌이익",
      targets: {}, annualTarget: null, h1Actual: null, note: "H2 재설계상 CPO본부는 브랜드사업부 소속 — 본부 KPI 정의 확인 필요",
    },
    {
      id: teamGoalId("전략기획팀"), level: "team", name: "데이터 정합성 · KPI 정렬도", division: "CEO본부", team: "전략기획팀", parentId: "division:CEO본부",
      unit: "percent", source: "manual", sourceNote: "", targets: {}, note: "H2 지원부서 KPI 후보안 — 확정 필요",
    },
    {
      id: teamGoalId("해외팀"), level: "team", name: "해외 순매출", division: "CEO본부", team: "해외팀", parentId: "division:CEO본부",
      unit: "currency", source: "connectable", sourceNote: "국내 시트 해외사업부 컬럼", targets: {}, note: "H1 연간목표 25억 — H2 확정 필요",
    },
    {
      id: teamGoalId("경영지원팀"), level: "team", name: "고정비 효율화 · 손익 마감 준수", division: "COO본부", team: "경영지원팀", parentId: "division:COO본부",
      unit: "percent", source: "manual", sourceNote: "", targets: {}, note: "H2 지원부서 KPI 후보안 — 확정 필요",
    },
    {
      id: teamGoalId("브랜드팀"), level: "team", name: "PB 공헌이익", division: "COO본부", team: "브랜드팀", parentId: "division:COO본부",
      unit: "currency", source: "connectable", sourceNote: "Tableau 채널·SKU 공헌이익", targets: {}, note: "H2 유일한 이익목표 — 목표값 확정 필요",
    },
    {
      id: teamGoalId("CS팀"), level: "team", name: "1차 상담 종결율 · 고객만족도", division: "COO본부", team: "CS팀", parentId: "division:COO본부",
      unit: "percent", source: "connectable", sourceNote: "채널톡", targets: {}, note: "H2 지원부서 KPI 후보안 — 확정 필요",
    },
    {
      id: teamGoalId("상품기획팀"), level: "team", name: "식/용품 카테고리 공헌이익", division: "CPO본부", team: "상품기획팀", parentId: "division:CPO본부",
      unit: "currency", source: "connectable", sourceNote: "Tableau 카테고리 공헌이익", targets: {}, note: "구성원 Key Metric에서 추론 — 확정 필요",
    },
    {
      id: teamGoalId("디자인팀"), level: "team", name: "장난감 카테고리 공헌이익", division: "CPO본부", team: "디자인팀", parentId: "division:CPO본부",
      unit: "currency", source: "connectable", sourceNote: "Tableau 카테고리 공헌이익", targets: {}, note: "구성원 Key Metric에서 추론 — 확정 필요",
    },
    {
      id: teamGoalId("패션팀"), level: "team", name: "패션 카테고리 공헌이익", division: "CPO본부", team: "패션팀", parentId: "division:CPO본부",
      unit: "currency", source: "connectable", sourceNote: "Tableau 카테고리 공헌이익", targets: {}, note: "구성원 Key Metric에서 추론 — 확정 필요",
    },
    {
      id: teamGoalId("개발팀"), level: "team", name: "프로젝트 종결 · 기능 구현", division: "CPO본부", team: "개발팀", parentId: "division:CPO본부",
      unit: "count", source: "action", sourceNote: "완료 액션 건수", targets: {}, note: "구성원 Key Metric에서 추론 — 확정 필요",
    },
  ];
  return goals.map((g, order) => ({ ...g, order }));
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
        parentGoalId: teamGoalId(p.team),
        targets: {},
        order: order++,
      };
    })
  );
}
