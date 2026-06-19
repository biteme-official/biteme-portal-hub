import { getActiveDashboards, getCategories } from "@/lib/dashboards";
import DashboardCard from "@/components/DashboardCard";
import { LayoutDashboard } from "lucide-react";

export default function Home() {
  const dashboards = getActiveDashboards();
  const categories = getCategories();

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mb-5">
          <LayoutDashboard size={28} className="text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          포털 허브에 오신 것을 환영합니다
        </h2>
        <p className="text-sm text-text-secondary max-w-md mb-6">
          아직 등록된 대시보드가 없습니다.
          <br />
          <code className="text-xs bg-surface px-1.5 py-0.5 rounded">
            dashboards.json
          </code>
          에 항목을 추가하면 이곳에 표시됩니다.
        </p>
        <div className="bg-white border border-border rounded-xl p-5 text-left max-w-lg w-full">
          <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">
            등록된 카테고리
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="text-xs bg-surface text-text-secondary px-3 py-1.5 rounded-full"
              >
                {cat.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const grouped = categories
    .map((cat) => ({
      ...cat,
      items: dashboards.filter((d) => d.category === cat.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">대시보드</h1>
        <p className="text-sm text-text-secondary mt-1">
          전사 업무 툴 & 대시보드 ({dashboards.length}개)
        </p>
      </div>

      {grouped.map((group) => (
        <section key={group.id} className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.items.map((d) => (
              <DashboardCard key={d.slug} dashboard={d} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
