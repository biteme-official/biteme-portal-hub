import { fetchProductData, type ProductSummary } from "../product-data";
import type { DataSummary } from "./types";

export async function collectAndSummarizeProduct(): Promise<DataSummary> {
  const products = await fetchProductData();
  return buildProductSummary(products);
}

function buildProductSummary(products: ProductSummary[]): DataSummary {
  const total = products.length;
  const confirmed = products.filter((p) => p.isConfirmed).length;
  const priceConfirmed = products.filter((p) => p.isPriceConfirmed).length;
  const totalOrderQty = products.reduce((s, p) => s + p.totalOrderQty, 0);

  const categoryMap = new Map<
    string,
    { count: number; orderQty: number; revenue: number }
  >();
  for (const p of products) {
    const cat = p.category || "미분류";
    const prev = categoryMap.get(cat) || { count: 0, orderQty: 0, revenue: 0 };
    categoryMap.set(cat, {
      count: prev.count + 1,
      orderQty: prev.orderQty + p.totalOrderQty,
      revenue: prev.revenue + p.price * p.totalOrderQty,
    });
  }

  const avgCostRatio =
    products.filter((p) => p.price > 0).length > 0
      ? (
          (products
            .filter((p) => p.price > 0)
            .reduce((s, p) => s + p.cost / p.price, 0) /
            products.filter((p) => p.price > 0).length) *
          100
        ).toFixed(1)
      : "0";

  const categoryBreakdown = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].orderQty - a[1].orderQty)
    .map(([cat, v]) => `${cat} ${v.count}개(발주 ${v.orderQty.toLocaleString()})`)
    .join(", ");

  const narrative = `등록 SKU ${total}개, 확정 ${confirmed}개, 프라이싱 확정 ${priceConfirmed}개. 총 발주량 ${totalOrderQty.toLocaleString()}. 평균 원가율 ${avgCostRatio}%. 카테고리: ${categoryBreakdown}.`;

  const unconfirmedSkus = products
    .filter((p) => !p.isPriceConfirmed)
    .slice(0, 20)
    .map((p) => ({
      SKU: p.name,
      카테고리: p.category,
      브랜드: p.brand,
      판매가: p.price,
      원가: p.cost,
    }));

  const topByOrderQty = [...products]
    .sort((a, b) => b.totalOrderQty - a.totalOrderQty)
    .slice(0, 20)
    .map((p) => ({
      SKU: p.name,
      카테고리: p.category,
      브랜드: p.brand,
      판매가: p.price,
      원가: p.cost,
      원가율: p.price > 0 ? `${((p.cost / p.price) * 100).toFixed(1)}%` : "-",
      발주량: p.totalOrderQty,
      오픈일: p.releaseDate || "미정",
      가격확정: p.isPriceConfirmed ? "확정" : "미확정",
    }));

  const allSkus = products.map((p) => ({
    SKU: p.name,
    카테고리: p.category,
    브랜드: p.brand,
    타입: p.skuType,
    오픈일: p.releaseDate || "미정",
    입고예정일: p.arrivalDate || "미정",
    촬영예정일: p.shootingDate || "미정",
    판매가: p.price,
    원가: p.cost,
    정가: p.regularPrice,
    발주량: p.totalOrderQty,
    가격확정: p.isPriceConfirmed ? "확정" : "미확정",
    확정여부: p.isConfirmed ? "확정" : "미확정",
    메모: p.memo,
  }));

  return {
    meta: {
      sourceId: "product",
      label: "프로덕트 대시보드",
      lastUpdated: new Date().toISOString(),
      recordCount: total,
    },
    kpis: {
      "총 SKU": total,
      "확정 SKU": confirmed,
      "프라이싱 확정": priceConfirmed,
      "프라이싱 미확정": total - priceConfirmed,
      "총 발주량": totalOrderQty,
      "평균 원가율(%)": avgCostRatio,
    },
    narrative,
    details: JSON.stringify({
      전체SKU: allSkus,
      발주량TOP20: topByOrderQty,
      프라이싱미확정: unconfirmedSkus,
      카테고리별: Object.fromEntries(categoryMap),
    }),
  };
}
