import type { DataSummary } from "./types";

const BASE_URL = "https://api.commerce.naver.com/external";

interface NaverOrder {
  orderId: string;
  orderDate: string;
  paymentDate: string;
  productOrderId: string;
  productOrderStatus: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPaymentAmount: number;
  deliveryAttributeType: string;
  inflowPath: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const bcrypt = await import("bcryptjs");
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const signature = bcrypt.hashSync(password, clientSecret);
  const clientSecretSign = Buffer.from(signature).toString("base64");

  const params = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: clientSecretSign,
    grant_type: "client_credentials",
    type: "SELF",
  });

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Naver token error: ${res.status}`);
  const data = await res.json();

  tokenCache = {
    token: data.access_token,
    expiresAt: timestamp + data.expires_in * 1000,
  };
  return tokenCache.token;
}

async function fetchOrders(
  token: string,
  from: Date,
  to: Date
): Promise<NaverOrder[]> {
  const allOrders: NaverOrder[] = [];
  const limit = 500;
  let hasMore = true;
  let lastChangedFrom = formatDate(from);
  const lastChangedTo = formatDate(to);

  while (hasMore) {
    const url = `${BASE_URL}/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=${lastChangedFrom}&lastChangedTo=${lastChangedTo}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retry = parseInt(res.headers.get("Retry-After") || "3", 10);
      await new Promise((r) => setTimeout(r, retry * 1000));
      continue;
    }

    if (!res.ok) throw new Error(`Naver API ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const items = data.data?.lastChangeStatuses || [];

    if (items.length === 0) break;

    const productOrderIds = items.map(
      (i: { productOrderId: string }) => i.productOrderId
    );

    const detailRes = await fetch(
      `${BASE_URL}/v1/pay-order/seller/product-orders/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productOrderIds }),
      }
    );

    if (!detailRes.ok) throw new Error(`Naver detail API ${detailRes.status}`);
    const detailData = await detailRes.json();

    for (const po of detailData.data?.productOrders || []) {
      allOrders.push({
        orderId: po.orderId,
        orderDate: po.orderDate,
        paymentDate: po.paymentDate,
        productOrderId: po.productOrderId,
        productOrderStatus: po.productOrderStatus,
        productId: po.productId,
        productName: po.productName,
        quantity: po.quantity,
        totalPaymentAmount: po.totalPaymentAmount,
        deliveryAttributeType: po.deliveryAttributeType || "",
        inflowPath: po.inflowPath || "",
      });
    }

    if (items.length < limit) {
      hasMore = false;
    } else {
      lastChangedFrom = items[items.length - 1].lastChangedDate;
    }

    await new Promise((r) => setTimeout(r, 600));
  }

  return allOrders;
}

function formatDate(d: Date): string {
  return d.toISOString().replace("Z", "+09:00");
}

export async function collectAndSummarizeSmartstoreFromLocal(
  clientId: string,
  clientSecret: string,
  daysBack = 30
): Promise<DataSummary> {
  const token = await getToken(clientId, clientSecret);

  const to = new Date();
  const from = new Date(to.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const orders = await fetchOrders(token, from, to);

  return buildSmartstoreSummary(orders, {
    start: from.toISOString().slice(0, 10),
    end: to.toISOString().slice(0, 10),
  });
}

function buildSmartstoreSummary(
  orders: NaverOrder[],
  period: { start: string; end: string }
): DataSummary {
  const paidOrders = orders.filter(
    (o) =>
      o.productOrderStatus !== "CANCELED" &&
      o.productOrderStatus !== "RETURNED"
  );
  const totalSales = paidOrders.reduce(
    (s, o) => s + o.totalPaymentAmount,
    0
  );
  const totalOrders = paidOrders.length;
  const totalQty = paidOrders.reduce((s, o) => s + o.quantity, 0);
  const uniqueBuyers = new Set(paidOrders.map((o) => o.orderId)).size;
  const aov = uniqueBuyers > 0 ? Math.round(totalSales / uniqueBuyers) : 0;

  const nDelivery = paidOrders.filter(
    (o) => o.deliveryAttributeType === "QUICK_SVC"
  ).length;
  const nDeliveryRatio =
    totalOrders > 0 ? ((nDelivery / totalOrders) * 100).toFixed(1) : "0";

  const productMap = new Map<
    string,
    { qty: number; revenue: number }
  >();
  for (const o of paidOrders) {
    const prev = productMap.get(o.productName) || { qty: 0, revenue: 0 };
    productMap.set(o.productName, {
      qty: prev.qty + o.quantity,
      revenue: prev.revenue + o.totalPaymentAmount,
    });
  }

  const topProducts = [...productMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([name, v]) => ({ 상품: name, 수량: v.qty, 매출: v.revenue }));

  const inflowMap = new Map<string, number>();
  for (const o of paidOrders) {
    const path = o.inflowPath || "기타";
    inflowMap.set(path, (inflowMap.get(path) || 0) + 1);
  }
  const inflowBreakdown = [...inflowMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([path, count]) => ({ 유입경로: path, 건수: count }));

  const dailySales = new Map<string, { revenue: number; orders: number }>();
  for (const o of paidOrders) {
    const day = (o.paymentDate || o.orderDate).slice(0, 10);
    const prev = dailySales.get(day) || { revenue: 0, orders: 0 };
    dailySales.set(day, {
      revenue: prev.revenue + o.totalPaymentAmount,
      orders: prev.orders + 1,
    });
  }
  const dailySalesArr = [...dailySales.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .map(([date, v]) => ({ 날짜: date, 매출: v.revenue, 주문수: v.orders }));

  const topProductNames = topProducts
    .slice(0, 5)
    .map((p) => p.상품)
    .join(", ");

  const narrative = `스마트스토어 ${period.start}~${period.end} 기간 매출 ₩${totalSales.toLocaleString()}, 주문 ${totalOrders.toLocaleString()}건(${totalQty.toLocaleString()}개), 구매자 ${uniqueBuyers.toLocaleString()}명. AOV ₩${aov.toLocaleString()}. N배송 비율 ${nDeliveryRatio}%. 인기 상품: ${topProductNames}.`;

  return {
    meta: {
      sourceId: "smartstore",
      label: "스마트스토어",
      lastUpdated: new Date().toISOString(),
      recordCount: totalOrders,
      periodStart: period.start,
      periodEnd: period.end,
    },
    kpis: {
      "총 매출(₩)": totalSales,
      "주문 건수": totalOrders,
      "총 판매수량": totalQty,
      "구매자 수": uniqueBuyers,
      "AOV(₩)": aov,
      "N배송 비율(%)": nDeliveryRatio,
    },
    narrative,
    details: JSON.stringify({
      상품TOP10: topProducts,
      유입경로: inflowBreakdown,
      일별매출: dailySalesArr,
    }),
  };
}
