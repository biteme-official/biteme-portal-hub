import Link from "next/link";
import { ExternalLink, GitBranch } from "lucide-react";
import type { Dashboard } from "@/lib/types";
import { getCategories } from "@/lib/dashboards";

const categoryColors: Record<string, string> = {
  d2c: "bg-blue-100 text-blue-700",
  product: "bg-emerald-100 text-emerald-700",
  revenue: "bg-purple-100 text-purple-700",
  "sku-pricing": "bg-amber-100 text-amber-700",
  strategy: "bg-rose-100 text-rose-700",
  etc: "bg-gray-100 text-gray-600",
};

export default function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const categories = getCategories();
  const cat = categories.find((c) => c.id === dashboard.category);
  const colorClass = categoryColors[dashboard.category] || categoryColors.etc;

  return (
    <Link
      href={`/dashboard/${dashboard.slug}`}
      className="group block bg-surface-card rounded-xl border border-border p-5 no-underline hover:shadow-md hover:border-accent/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}
        >
          {cat?.label || dashboard.category}
        </span>
        {dashboard.type === "external" && (
          <ExternalLink size={14} className="text-text-secondary" />
        )}
      </div>

      <h3 className="text-[15px] font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
        {dashboard.name}
      </h3>

      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {dashboard.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-secondary">{dashboard.owner}</span>
          {dashboard.github && (
            <GitBranch size={12} className="text-text-secondary" />
          )}
        </div>
        <div className="flex gap-1">
          {dashboard.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-text-secondary bg-surface px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
