import type { DashboardConfig, Dashboard, Category } from "./types";
import config from "../../dashboards.json";

const data = config as DashboardConfig;

export function getCategories(): Category[] {
  return data.categories.sort((a, b) => a.order - b.order);
}

export function getDashboards(): Dashboard[] {
  return data.dashboards;
}

export function getActiveDashboards(): Dashboard[] {
  return data.dashboards.filter((d) => d.status === "active");
}

export function getArchivedDashboards(): Dashboard[] {
  return data.dashboards.filter((d) => d.status === "archive");
}

export function getDashboardBySlug(slug: string): Dashboard | undefined {
  return data.dashboards.find((d) => d.slug === slug);
}

export function getDashboardsByCategory(categoryId: string): Dashboard[] {
  return data.dashboards.filter((d) => d.category === categoryId);
}

export function searchDashboards(query: string): Dashboard[] {
  const q = query.toLowerCase().trim();
  if (!q) return data.dashboards;
  return data.dashboards.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
  );
}

// 메뉴 노출 규칙: visiblePositions가 있으면 관리자 또는 해당 직책만 보임 (빈 배열 = 관리자만)
export function isVisibleTo(
  d: Dashboard,
  user: { role?: string; position?: string } | null | undefined
): boolean {
  if (!d.visiblePositions) return true;
  if (user?.role === "admin") return true;
  return !!user?.position && d.visiblePositions.includes(user.position);
}
