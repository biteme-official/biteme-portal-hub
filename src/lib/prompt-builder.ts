import type { DataSummary, SourceId } from "./data-sources/types";

export function buildSystemPrompt(
  summaries: Partial<Record<SourceId, DataSummary>>,
  selectedSources: SourceId[]
): string {
  const sourceBlocks: string[] = [];

  for (const id of selectedSources) {
    const s = summaries[id];
    if (!s) continue;

    const updatedAt = new Date(s.meta.lastUpdated).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const kpiLines = Object.entries(s.kpis)
      .map(([k, v]) => `  ${k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
      .join("\n");

    sourceBlocks.push(
      `\n## [${s.meta.label}] (${updatedAt} 기준, ${s.meta.recordCount}건)\n\n${s.narrative}\n\n주요 지표:\n${kpiLines}\n\n상세 데이터:\n${s.details}`
    );
  }

  const availableSources = selectedSources
    .filter((id) => summaries[id])
    .map((id) => `[${summaries[id]!.meta.label}]`)
    .join(", ");

  return `당신은 바잇미(BiteMe) 포털 허브의 AI 어시스턴트입니다.
아래 데이터 소스들의 요약 정보를 기반으로 질문에 답변하세요.

현재 참조 가능한 데이터: ${availableSources || "없음"}

답변 규칙:
- 한국어로 답변
- 간결하고 핵심적으로 답변
- 데이터에 없는 정보는 "해당 데이터가 없습니다"라고 답변
- 표 형태가 적절하면 마크다운 표 사용
- 금액은 천 단위 쉼표 포함
- 답변에 사용한 데이터의 출처를 명시하세요 (예: [프로덕트 대시보드], [스마트스토어], [B2B 도매])
- 데이터의 기준 시점(마지막 업데이트)을 언급하세요
- 여러 소스를 비교할 때는 비교 표를 사용하세요
${sourceBlocks.join("\n")}`;
}
