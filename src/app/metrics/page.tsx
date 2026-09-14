"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DIVISIONS, PEOPLE } from "@/app/performance/org-data";
import MetricSettings from "@/app/performance/MetricSettings";
import { PERIODS, PERIOD_LABEL, type Period } from "@/app/performance/metric-settings-data";

export default function MetricsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [period, setPeriod] = useState<Period>("2026Q3");

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">지표 설정</h1>
          <p className="text-sm text-text-secondary mt-1">전사 → 본부 → 팀 KPI → 개인 지표 목표와 데이터 출처 정리</p>
        </div>
        <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? "bg-white text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              {PERIOD_LABEL[p]} 목표
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-5 border-b border-border overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        {DIVISIONS.map((d) => {
          const n = PEOPLE.filter((p) => p.division === d).length;
          return (
            <button
              key={d}
              onClick={() => setDivision(d)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${division === d ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"}`}
            >
              {d}
              <span className="ml-1.5 text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded-full">{n}</span>
            </button>
          );
        })}
      </div>

      <MetricSettings division={division} period={period} />
    </div>
  );
}
