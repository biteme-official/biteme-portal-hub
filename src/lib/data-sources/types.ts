export type SourceId = "product" | "smartstore";

export interface SourceMeta {
  sourceId: SourceId;
  label: string;
  lastUpdated: string;
  recordCount: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface DataSummary {
  meta: SourceMeta;
  kpis: Record<string, string | number>;
  narrative: string;
  details: string;
}

export const SOURCE_LABELS: Record<SourceId, string> = {
  product: "프로덕트 대시보드",
  smartstore: "스마트스토어",
};
