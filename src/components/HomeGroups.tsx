"use client";

import DashboardCard from "@/components/DashboardCard";
import { useAuth } from "@/contexts/AuthContext";
import { isVisibleTo } from "@/lib/dashboards";
import type { Dashboard } from "@/lib/types";

type Group = { id: string; label: string; items: Dashboard[] };

// 첫 화면도 사이드바와 같은 노출 규칙(visiblePositions)을 따른다
export default function HomeGroups({ groups }: { groups: Group[] }) {
  const { user } = useAuth();
  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((d) => isVisibleTo(d, user)) }))
    .filter((g) => g.items.length > 0);
  const total = visible.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">대시보드</h1>
        <p className="text-sm text-text-secondary mt-1">
          전사 업무 툴 & 대시보드 ({total}개)
        </p>
      </div>
      {visible.map((group) => (
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
