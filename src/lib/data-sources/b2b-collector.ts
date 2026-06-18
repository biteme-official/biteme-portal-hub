import type { DataSummary } from "./types";

const API_BASE = "https://api.bcart.jp/api/v1";

function getToken(): string {
  const token = process.env.BCART_API_TOKEN;
  if (!token) throw new Error("BCART_API_TOKEN이 설정되지 않았습니다.");
  return token;
}

interface BcartCustomer {
  id: number;
  comp_name: string;
  tanto_name: string;
  email: string;
  created_at: string;
}

interface BcartOrder {
  id: number;
  code: string;
  customer_id: number;
  ordered_at: string;
  final_price: number;
  status: number;
}

interface BcartOrderProduct {
  order_id: number;
  product_name: string;
  product_set_id: number;
  order_pro_count: number;
  unit_price: number;
}

async function fetchWithRetry(
  url: string,
  token: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

async function fetchAllPages<T>(
  endpoint: string,
  dataKey: string,
  token: string
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${API_BASE}${endpoint}?limit=${limit}&offset=${offset}`;
    const res = await fetchWithRetry(url, token);
    if (!res.ok) throw new Error(`Bcart API ${res.status}: ${await res.text()}`);

    const json = await res.json();
    const items = json[dataKey] as T[];
    if (!items || items.length === 0) break;

    all.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }

  return all;
}

export async function collectAndSummarizeB2B(): Promise<DataSummary> {
  const token = getToken();

  const [customers, orders, orderProducts] = await Promise.all([
    fetchAllPages<BcartCustomer>("/customers", "customers", token),
    fetchAllPages<BcartOrder>("/orders", "orders", token),
    fetchAllPages<BcartOrderProduct>(
      "/order_products",
      "order_products",
      token
    ),
  ]);

  return buildB2BSummary(customers, orders, orderProducts);
}

function buildB2BSummary(
  customers: BcartCustomer[],
  orders: BcartOrder[],
  orderProducts: BcartOrderProduct[]
): DataSummary {
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.final_price, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const now = new Date();
  const days90ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter(
    (o) => new Date(o.ordered_at) >= days90ago
  );
  const activeCustomerIds = new Set(recentOrders.map((o) => o.customer_id));

  const customerRevenue = new Map<number, number>();
  for (const o of orders) {
    customerRevenue.set(
      o.customer_id,
      (customerRevenue.get(o.customer_id) || 0) + o.final_price
    );
  }

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const topCustomers = [...customerRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, revenue]) => ({
      거래처: customerMap.get(id)?.comp_name || `ID:${id}`,
      총매출: revenue,
      주문수: orders.filter((o) => o.customer_id === id).length,
    }));

  const productRevenue = new Map<string, { qty: number; revenue: number }>();
  for (const op of orderProducts) {
    const name = op.product_name;
    const prev = productRevenue.get(name) || { qty: 0, revenue: 0 };
    productRevenue.set(name, {
      qty: prev.qty + op.order_pro_count,
      revenue: prev.revenue + op.unit_price * op.order_pro_count,
    });
  }

  const topProducts = [...productRevenue.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([name, v]) => ({ 상품: name, 수량: v.qty, 매출: v.revenue }));

  const dailySales = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const day = o.ordered_at.slice(0, 10);
    const prev = dailySales.get(day) || { revenue: 0, orders: 0 };
    dailySales.set(day, {
      revenue: prev.revenue + o.final_price,
      orders: prev.orders + 1,
    });
  }

  const recentDailySales = [...dailySales.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .map(([date, v]) => ({ 날짜: date, 매출: v.revenue, 주문수: v.orders }));

  const recentRevenue = recentOrders.reduce((s, o) => s + o.final_price, 0);

  const topCustomerNames = topCustomers
    .slice(0, 5)
    .map((c) => c.거래처)
    .join(", ");

  const narrative = `B2B 도매 총 거래처 ${totalCustomers}사, 총 주문 ${totalOrders.toLocaleString()}건, 총 매출 ¥${totalRevenue.toLocaleString()}. 90일 활성 거래처 ${activeCustomerIds.size}사, 최근 90일 매출 ¥${recentRevenue.toLocaleString()}. 평균 주문 단가 ¥${avgOrderValue.toLocaleString()}. 상위 거래처: ${topCustomerNames}.`;

  const orderDates = orders.map((o) => o.ordered_at).sort();

  return {
    meta: {
      sourceId: "b2b",
      label: "B2B 도매",
      lastUpdated: new Date().toISOString(),
      recordCount: totalOrders,
      periodStart: orderDates[0]?.slice(0, 10),
      periodEnd: orderDates[orderDates.length - 1]?.slice(0, 10),
    },
    kpis: {
      "총 거래처": totalCustomers,
      "활성 거래처(90일)": activeCustomerIds.size,
      "총 주문수": totalOrders,
      "총 매출(¥)": totalRevenue,
      "평균 주문 단가(¥)": avgOrderValue,
      "최근 90일 매출(¥)": recentRevenue,
    },
    narrative,
    details: JSON.stringify({
      거래처TOP10: topCustomers,
      상품TOP10: topProducts,
      일별매출최근30일: recentDailySales,
    }),
  };
}
