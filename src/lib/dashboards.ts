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
