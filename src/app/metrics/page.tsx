"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import MetricSettings from "@/app/performance/MetricSettings";

export default function MetricsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary">지표 설정</h1>
        <p className="text-sm text-text-secondary mt-1">전사 목표 → 팀 KPI → 개인 지표 순으로 정리</p>
      </div>
      <MetricSettings />
    </div>
  );
}
