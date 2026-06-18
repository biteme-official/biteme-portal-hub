import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { fetchProductData } from "@/lib/product-data";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { messages } = await req.json();

  let dataContext = "데이터를 불러올 수 없습니다.";
  try {
    const products = await fetchProductData();
    const summary = products.map((p) => ({
      SKU명: p.name,
      카테고리: p.category,
      브랜드: p.brand,
      타입: p.skuType,
      오픈일: p.releaseDate || "미정",
      입고예정일: p.arrivalDate || "미정",
      촬영예정일: p.shootingDate || "미정",
      판매가: p.price,
      원가: p.cost,
      정가: p.regularPrice,
      원가율: p.price > 0 ? `${((p.cost / p.price) * 100).toFixed(1)}%` : "-",
      상시할인율:
        p.regularPrice > 0
          ? `${(((p.regularPrice - p.price) / p.regularPrice) * 100).toFixed(1)}%`
          : "-",
      총발주량: p.totalOrderQty,
      가격확정: p.isPriceConfirmed ? "확정" : "미확정",
      확정여부: p.isConfirmed ? "확정" : "미확정",
    }));
    dataContext = JSON.stringify(summary, null, 2);
  } catch (e) {
    console.error("Product data fetch error:", e);
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: `당신은 바잇미(BiteMe) 포털 허브의 AI 어시스턴트입니다.
아래 프로덕트 대시보드 데이터를 기반으로 질문에 답변하세요.

답변 규칙:
- 한국어로 답변
- 간결하고 핵심적으로 답변
- 데이터에 없는 정보는 "해당 데이터가 없습니다"라고 답변
- 표 형태가 적절하면 마크다운 표 사용
- 금액은 천 단위 쉼표 포함

[프로덕트 대시보드 SKU 데이터]
${dataContext}`,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
