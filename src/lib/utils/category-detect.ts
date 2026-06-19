import type { ApprovalCategory } from "@/lib/types/approval";

const KEYWORDS: Record<ApprovalCategory, string[]> = {
  "사업/전략": [
    "전략", "사업", "투자", "제휴", "파트너", "계약", "MOU", "사업계획",
    "신규사업", "시장", "확장", "인수", "지분", "IR", "BM", "비즈니스",
  ],
  "마케팅/프로모션": [
    "마케팅", "프로모션", "광고", "캠페인", "이벤트", "할인", "쿠폰",
    "SNS", "인스타", "블로그", "콘텐츠", "브랜딩", "홍보", "배너",
    "CRM", "리타겟", "프로모", "세일", "판촉",
  ],
  "제품/MD": [
    "제품", "상품", "MD", "신상", "입고", "재고", "SKU", "패키지",
    "디자인", "샘플", "OEM", "ODM", "라벨", "성분", "원료",
  ],
  "구매/발주": [
    "구매", "발주", "주문", "견적", "단가", "납품", "공급", "거래처",
    "원자재", "물류", "배송", "운송", "통관", "수입", "수출",
  ],
  "운영/CS": [
    "운영", "CS", "고객", "클레임", "반품", "교환", "환불", "배송",
    "문의", "응대", "매뉴얼", "가이드", "SOP", "시스템", "서버",
  ],
  "기타": [],
};

export function detectCategory(text: string): ApprovalCategory {
  const normalized = text.toLowerCase();
  let best: ApprovalCategory = "기타";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(KEYWORDS) as [ApprovalCategory, string[]][]) {
    if (keywords.length === 0) continue;
    let score = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  return best;
}
