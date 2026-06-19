import type { SourceId } from "./data-sources/types";

const APPROVAL_KEYWORDS = [
  "결재", "승인", "반려", "전자결재", "기안", "결재자", "참조",
  "임시저장", "결재선", "결재라인", "결재문서", "긴급",
];

export function needsApprovalContext(question: string): boolean {
  const q = question.toLowerCase();
  return APPROVAL_KEYWORDS.some((kw) => q.includes(kw));
}

const SOURCE_KEYWORDS: Record<SourceId, string[]> = {
  product: [
    "SKU", "프로덕트", "상품", "출시", "출시일", "발주", "원가", "원가율",
    "프라이싱", "카테고리", "브랜드", "촬영", "입고", "확정", "미확정",
    "정가", "판매가", "패딩", "니트", "의류", "장난감", "용품", "산리오",
  ],
  smartstore: [
    "스마트스토어", "네이버", "naver", "N배송", "유입", "인플로우",
    "쇼핑검색", "AOV", "구매자", "주문건", "자사몰", "D2C",
    "배송", "결제", "반품", "교환", "매출", "주문", "판매",
  ],
};

const CROSS_SOURCE_KEYWORDS = [
  "비교", "vs", "대비", "전체", "종합", "요약", "현황",
  "채널별", "전사", "overview", "모든", "다",
];

const SHARED_KEYWORDS: Record<string, SourceId[]> = {
  "매출": ["smartstore", "product"],
  "주문": ["smartstore"],
  "판매": ["smartstore", "product"],
};

export function routeSources(question: string): SourceId[] {
  const q = question.toLowerCase();

  const isCrossSource = CROSS_SOURCE_KEYWORDS.some((kw) => q.includes(kw));
  if (isCrossSource) return ["product", "smartstore"];

  const scores: Record<SourceId, number> = { product: 0, smartstore: 0 };

  for (const [sourceId, keywords] of Object.entries(SOURCE_KEYWORDS)) {
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        scores[sourceId as SourceId] += 1;
      }
    }
  }

  for (const [kw, sources] of Object.entries(SHARED_KEYWORDS)) {
    if (q.includes(kw)) {
      for (const s of sources) scores[s] += 0.5;
    }
  }

  const matched = (Object.entries(scores) as [SourceId, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  return matched.length > 0 ? matched : ["product", "smartstore"];
}
