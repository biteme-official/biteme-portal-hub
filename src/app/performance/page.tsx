"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Sparkles,
  User,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Lock,
  Settings,
  Plus,
  Trash2,
  X,
  Target,
  Edit3,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ──────────────────────────────────────────────────

type MetricStatus = "긍정" | "부정" | "유지";
type ViewRole = "admin" | "member";
type AdminSubTab = "aggregate" | "settings";

interface WeekValue {
  label: string;
  value: number | null;
}

interface ChannelData {
  channel: string;
  weeks: WeekValue[];
  monthlyCumulative: number;
  monthlyTarget: number | null;
  monthlyAchievement: number | null;
  currentWeek: number;
  prevWeek: number;
  changeRate: number;
  status: MetricStatus;
}

interface ActionItem {
  id: string;
  metric: string;
  description: string;
}

interface AIFactor {
  id: string;
  type: MetricStatus;
  channel: string;
  description: string;
  isAiRecommended: boolean;
  isEditRequested: boolean;
  editedDescription: string;
}

interface PersonReport {
  name: string;
  position: string;
  team: string;
  email: string;
  keyMetrics: string[];
  channels: ChannelData[];
  totalMonthlyCM: number;
  totalMonthlyTarget: number | null;
  currentWeekTotal: number;
  prevWeekTotal: number;
  weekChangeRate: number;
  actions: ActionItem[];
  aiFactors: AIFactor[];
  submitted: boolean;
}

interface ScorecardConfig {
  email: string;
  name: string;
  team: string;
  metrics: string[];
}

type Tab = "brand" | "growth" | "all";

// ─── Constants ──────────────────────────────────────────────

const MONTH_LABEL = "2026년 9월";
const MONTH_WEEKS = ["W1 (9/1~7)", "W2 (9/8~14)", "W3 (9/15~21)", "W4 (9/22~28)"];

const AVAILABLE_METRICS = [
  "자사몰", "스마트스토어", "쿠팡", "B2B", "해외", "그외", "온라인채널",
];

const TABS: { key: Tab; label: string; count: number }[] = [
  { key: "brand", label: "브랜드팀", count: 3 },
  { key: "growth", label: "그로스팀", count: 4 },
  { key: "all", label: "전사", count: 7 },
];

const MOCK_SCORECARD_CONFIGS: ScorecardConfig[] = [
  { email: "jiyun@biteme.co.kr", name: "이지윤", team: "브랜드팀", metrics: ["자사몰", "스마트스토어", "쿠팡"] },
  { email: "sohee@biteme.co.kr", name: "김소희", team: "브랜드팀", metrics: ["자사몰", "스마트스토어", "B2B"] },
  { email: "hasun@biteme.co.kr", name: "유하선", team: "브랜드팀", metrics: ["자사몰", "온라인채널"] },
];

// ─── Mock Data ──────────────────────────────────────────────

function makeChannel(
  channel: string,
  w1: number,
  monthly: number,
  target: number | null,
  achievement: number | null,
  prev: number,
  rate: number,
  status: MetricStatus,
): ChannelData {
  return {
    channel,
    weeks: [
      { label: "W1", value: w1 },
      { label: "W2", value: null },
      { label: "W3", value: null },
      { label: "W4", value: null },
    ],
    monthlyCumulative: monthly,
    monthlyTarget: target,
    monthlyAchievement: achievement,
    currentWeek: w1,
    prevWeek: prev,
    changeRate: rate,
    status,
  };
}

const MOCK_BRAND: PersonReport[] = [
  {
    name: "이지윤", position: "MD", team: "브랜드팀", email: "jiyun@biteme.co.kr",
    keyMetrics: ["자사몰", "스마트스토어", "쿠팡"],
    channels: [
      makeChannel("자사몰", 6000000, 22500000, 25000000, 90, 5500000, 9.1, "긍정"),
      makeChannel("스마트스토어", 4000000, 16800000, 18000000, 93.3, 4200000, -4.8, "부정"),
      makeChannel("쿠팡", 2000000, 8200000, 9000000, 91.1, 2000000, 0, "유지"),
    ],
    totalMonthlyCM: 47500000, totalMonthlyTarget: 52000000,
    currentWeekTotal: 12000000, prevWeekTotal: 11700000, weekChangeRate: 2.6,
    actions: [],
    aiFactors: [
      { id: "f1", type: "긍정", channel: "자사몰", description: "자사몰 전주 대비 9.1% 상승, 시즌 기획전 효과로 판단", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
      { id: "f2", type: "부정", channel: "스마트스토어", description: "스마트스토어 -4.8% 하락, 경쟁 셀러 프로모션 영향 추정", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
      { id: "f3", type: "유지", channel: "쿠팡", description: "쿠팡 변동 없음, 광고비 대비 안정적 유지", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
    ],
    submitted: false,
  },
  {
    name: "김소희", position: "MD", team: "브랜드팀", email: "sohee@biteme.co.kr",
    keyMetrics: ["자사몰", "스마트스토어", "B2B"],
    channels: [
      makeChannel("자사몰", 5000000, 19200000, 20000000, 96, 4600000, 8.7, "긍정"),
      makeChannel("스마트스토어", 3500000, 14000000, 15000000, 93.3, 3500000, 0, "유지"),
      makeChannel("B2B", 1000000, 3800000, 4000000, 95, 800000, 25.0, "긍정"),
    ],
    totalMonthlyCM: 37000000, totalMonthlyTarget: 39000000,
    currentWeekTotal: 9500000, prevWeekTotal: 8900000, weekChangeRate: 6.7,
    actions: [],
    aiFactors: [
      { id: "f1", type: "긍정", channel: "자사몰", description: "자사몰 +8.7% 성장, 리뷰 이벤트 효과", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
      { id: "f2", type: "긍정", channel: "B2B", description: "B2B +25% 대폭 상승, 신규 거래처 온보딩 효과", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
      { id: "f3", type: "유지", channel: "스마트스토어", description: "스마트스토어 변동 없음, 안정적 유지", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
    ],
    submitted: false,
  },
  {
    name: "유하선", position: "MD", team: "브랜드팀", email: "hasun@biteme.co.kr",
    keyMetrics: ["자사몰", "온라인채널"],
    channels: [
      makeChannel("자사몰", 4000000, 15600000, 18000000, 86.7, 4300000, -7.0, "부정"),
      makeChannel("온라인채널", 2200000, 8800000, 9000000, 97.8, 2100000, 4.8, "긍정"),
    ],
    totalMonthlyCM: 24400000, totalMonthlyTarget: 27000000,
    currentWeekTotal: 6200000, prevWeekTotal: 6400000, weekChangeRate: -3.1,
    actions: [],
    aiFactors: [
      { id: "f1", type: "부정", channel: "자사몰", description: "자사몰 -7.0% 하락, 재고 부족에 따른 품절 영향", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
      { id: "f2", type: "긍정", channel: "온라인채널", description: "온라인채널 +4.8% 상승, 네이버 쇼핑 노출 증가", isAiRecommended: true, isEditRequested: false, editedDescription: "" },
    ],
    submitted: false,
  },
];

// ─── Utilities ──────────────────────────────────────────────

function formatKRW(value: number): string {
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (Math.abs(value) >= 10000) return `${Math.round(value / 10000).toLocaleString()}만`;
  return value.toLocaleString();
}

function StatusBadge({ status }: { status: MetricStatus }) {
  const config = {
    긍정: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: TrendingUp },
    부정: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: TrendingDown },
    유지: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", icon: Minus },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <Icon size={10} />
      {status}
    </span>
  );
}

function ChangeRate({ rate }: { rate: number }) {
  if (rate > 0) return <span className="text-emerald-600 font-semibold text-xs">+{rate.toFixed(1)}%</span>;
  if (rate < 0) return <span className="text-red-600 font-semibold text-xs">{rate.toFixed(1)}%</span>;
  return <span className="text-gray-500 font-semibold text-xs">0.0%</span>;
}

function AchievementBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-secondary/40">—</span>;
  const color = value >= 100 ? "bg-emerald-500" : value >= 90 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-text-secondary font-medium">{value.toFixed(0)}%</span>
    </div>
  );
}

// ─── Monthly Scorecards ─────────────────────────────────────

function MonthlyScorecards({ channels }: { channels: ChannelData[] }) {
  const totalMonthly = channels.reduce((s, c) => s + c.monthlyCumulative, 0);
  const totalTarget = channels.reduce((s, c) => s + (c.monthlyTarget ?? 0), 0);
  const totalAchievement = totalTarget > 0 ? Math.round((totalMonthly / totalTarget) * 100) : null;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">{MONTH_LABEL} 월간 누적</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {channels.map((ch) => {
          const achColor = (ch.monthlyAchievement ?? 0) >= 100
            ? "text-emerald-600" : (ch.monthlyAchievement ?? 0) >= 90
            ? "text-amber-600" : "text-red-600";
          return (
            <div key={ch.channel} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">{ch.channel}</span>
                <StatusBadge status={ch.status} />
              </div>
              <p className="text-lg font-bold text-text-primary tabular-nums">{formatKRW(ch.monthlyCumulative)}</p>
              <div className="flex items-center justify-between mt-2">
                {ch.monthlyTarget && (
                  <span className="text-[11px] text-text-secondary">
                    목표 {formatKRW(ch.monthlyTarget)}
                  </span>
                )}
                {ch.monthlyAchievement !== null && (
                  <span className={`text-xs font-bold tabular-nums ${achColor}`}>
                    {ch.monthlyAchievement.toFixed(0)}%
                  </span>
                )}
              </div>
              <AchievementBar value={ch.monthlyAchievement} />
            </div>
          );
        })}
        <div className="bg-accent/5 rounded-xl border border-accent/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-accent">합계</span>
          </div>
          <p className="text-lg font-bold text-text-primary tabular-nums">{formatKRW(totalMonthly)}</p>
          <div className="flex items-center justify-between mt-2">
            {totalTarget > 0 && (
              <span className="text-[11px] text-text-secondary">목표 {formatKRW(totalTarget)}</span>
            )}
            {totalAchievement !== null && (
              <span className={`text-xs font-bold tabular-nums ${totalAchievement >= 100 ? "text-emerald-600" : totalAchievement >= 90 ? "text-amber-600" : "text-red-600"}`}>
                {totalAchievement}%
              </span>
            )}
          </div>
          <AchievementBar value={totalAchievement} />
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Breakdown Table ─────────────────────────────────

function WeeklyTable({ channels }: { channels: ChannelData[] }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">{MONTH_LABEL} 주간 추이</p>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/70">
                <th className="text-left text-[11px] font-semibold text-text-secondary px-4 py-2.5 uppercase tracking-wider">채널</th>
                {MONTH_WEEKS.map((w, i) => (
                  <th key={i} className={`text-right text-[11px] font-semibold px-3 py-2.5 uppercase tracking-wider ${i === 0 ? "text-accent" : "text-text-secondary/50"}`}>
                    {w}
                  </th>
                ))}
                <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">전주</th>
                <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">변화</th>
                <th className="text-center text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.channel} className="border-t border-border/50 hover:bg-surface/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-text-primary">{ch.channel}</td>
                  {ch.weeks.map((w, i) => (
                    <td key={i} className={`px-3 py-2.5 text-right tabular-nums ${i === 0 ? "font-semibold text-text-primary" : "text-text-secondary/40"}`}>
                      {w.value !== null ? formatKRW(w.value) : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">{formatKRW(ch.prevWeek)}</td>
                  <td className="px-3 py-2.5 text-right"><ChangeRate rate={ch.changeRate} /></td>
                  <td className="px-3 py-2.5 text-center"><StatusBadge status={ch.status} /></td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-surface/50">
                <td className="px-4 py-2.5 font-bold text-text-primary">합계</td>
                {MONTH_WEEKS.map((_, i) => {
                  const weekTotal = channels.reduce((s, ch) => s + (ch.weeks[i]?.value ?? 0), 0);
                  const hasData = channels.some((ch) => ch.weeks[i]?.value !== null);
                  return (
                    <td key={i} className={`px-3 py-2.5 text-right tabular-nums ${i === 0 ? "font-bold text-text-primary" : "text-text-secondary/40"}`}>
                      {hasData ? formatKRW(weekTotal) : "—"}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-right font-semibold text-text-secondary tabular-nums">
                  {formatKRW(channels.reduce((s, ch) => s + ch.prevWeek, 0))}
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Action Input Section ───────────────────────────────────

function ActionSection({
  actions,
  keyMetrics,
  onAdd,
  onRemove,
  readOnly,
}: {
  actions: ActionItem[];
  keyMetrics: string[];
  onAdd: (metric: string, description: string) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  const [selectedMetric, setSelectedMetric] = useState(keyMetrics[0] ?? "");
  const [actionText, setActionText] = useState("");

  function handleAdd() {
    if (!selectedMetric || !actionText.trim()) return;
    onAdd(selectedMetric, actionText.trim());
    setActionText("");
  }

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">이번 주 액션</p>
      <div className="bg-white rounded-xl border border-border p-4">
        {!readOnly && (
          <div className="flex gap-2 mb-4">
            <div className="relative shrink-0">
              <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="pl-8 pr-8 py-2.5 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
              >
                {keyMetrics.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
            <input
              type="text"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="수행한 액션 또는 다음 주 계획 입력..."
              className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleAdd}
              disabled={!actionText.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Plus size={14} />
              추가
            </button>
          </div>
        )}

        {actions.length > 0 ? (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 bg-surface/50 border border-border/50 rounded-lg group">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-[11px] font-semibold rounded-full shrink-0 mt-0.5">
                  <Target size={10} />
                  {a.metric}
                </span>
                <span className="text-sm text-text-primary leading-relaxed flex-1">{a.description}</span>
                {!readOnly && (
                  <button
                    onClick={() => onRemove(a.id)}
                    className="p-1 rounded hover:bg-red-50 text-text-secondary/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary/50">
            {readOnly ? "등록된 액션이 없습니다" : "영향 지표를 선택하고 액션을 추가하세요"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Factors Panel ───────────────────────────────────────

function AIFactorsPanel({
  factors,
  onRequestEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  isAdmin,
}: {
  factors: AIFactor[];
  onRequestEdit: (factorId: string) => void;
  onSaveEdit: (factorId: string) => void;
  onCancelEdit: (factorId: string) => void;
  onEditChange: (factorId: string, text: string) => void;
  isAdmin: boolean;
}) {
  const statusConfig = {
    긍정: { bg: "border-l-emerald-400", icon: TrendingUp, iconColor: "text-emerald-600" },
    부정: { bg: "border-l-red-400", icon: TrendingDown, iconColor: "text-red-600" },
    유지: { bg: "border-l-gray-300", icon: Minus, iconColor: "text-gray-500" },
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-accent" />
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">AI 분석 요인</p>
      </div>
      <div className="space-y-2">
        {factors.map((f) => {
          const cfg = statusConfig[f.type];
          const Icon = cfg.icon;
          return (
            <div key={f.id} className={`bg-white rounded-lg border border-border border-l-[3px] ${cfg.bg} p-3`}>
              <div className="flex items-start gap-3">
                <Icon size={14} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={f.type} />
                    <span className="text-xs font-medium text-text-primary">{f.channel}</span>
                    {f.isAiRecommended && !f.isEditRequested && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200">
                        <Sparkles size={9} />
                        AI 추천
                      </span>
                    )}
                    {f.isEditRequested && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200">
                        <Edit3 size={9} />
                        수정요청
                      </span>
                    )}
                  </div>

                  {f.isEditRequested ? (
                    <div className="mt-2">
                      <textarea
                        value={f.editedDescription || f.description}
                        onChange={(e) => onEditChange(f.id, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-amber-50/30 text-text-primary focus:outline-none focus:border-accent resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => onCancelEdit(f.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-text-secondary hover:bg-surface rounded-md transition-colors"
                        >
                          <X size={11} />
                          취소
                        </button>
                        <button
                          onClick={() => onSaveEdit(f.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-white bg-accent rounded-md hover:bg-accent/90 transition-colors"
                        >
                          <Check size={11} />
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary leading-relaxed">{f.description}</p>
                  )}
                </div>

                {isAdmin && !f.isEditRequested && (
                  <button
                    onClick={() => onRequestEdit(f.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-secondary hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors shrink-0"
                  >
                    <Edit3 size={10} />
                    수정요청
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Person Card ────────────────────────────────────────────

function PersonCard({
  person,
  onAddAction,
  onRemoveAction,
  onRequestFactorEdit,
  onSaveFactorEdit,
  onCancelFactorEdit,
  onFactorEditChange,
  viewRole,
  isOwnCard,
}: {
  person: PersonReport;
  onAddAction: (metric: string, description: string) => void;
  onRemoveAction: (actionId: string) => void;
  onRequestFactorEdit: (factorId: string) => void;
  onSaveFactorEdit: (factorId: string) => void;
  onCancelFactorEdit: (factorId: string) => void;
  onFactorEditChange: (factorId: string, text: string) => void;
  viewRole: ViewRole;
  isOwnCard: boolean;
}) {
  const [expanded, setExpanded] = useState(isOwnCard);
  const canEdit = isOwnCard || viewRole === "admin";
  const monthlyAchievement = person.totalMonthlyTarget
    ? Math.round((person.totalMonthlyCM / person.totalMonthlyTarget) * 100)
    : null;
  const positiveCount = person.channels.filter((c) => c.status === "긍정").length;
  const negativeCount = person.channels.filter((c) => c.status === "부정").length;

  return (
    <div className={`bg-surface-card rounded-xl border overflow-hidden ${isOwnCard ? "border-accent/30 ring-1 ring-accent/10" : "border-border"}`}>
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isOwnCard ? "bg-accent/15" : "bg-accent/10"}`}>
            <User size={16} className="text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">{person.name}</span>
              <span className="text-[11px] text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                {person.position} · {person.team}
              </span>
              {isOwnCard && (
                <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">내 보고</span>
              )}
              {person.submitted && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">제출 완료</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-text-secondary">
                이번주 <span className="font-semibold text-text-primary">{formatKRW(person.currentWeekTotal)}</span>
              </span>
              <ChangeRate rate={person.weekChangeRate} />
              <span className="text-[10px] text-text-secondary/60">|</span>
              <span className="text-xs text-text-secondary">
                월 누적 <span className="font-semibold text-text-primary">{formatKRW(person.totalMonthlyCM)}</span>
              </span>
              {monthlyAchievement !== null && (
                <span className={`text-[11px] font-semibold tabular-nums ${monthlyAchievement >= 100 ? "text-emerald-600" : monthlyAchievement >= 90 ? "text-amber-600" : "text-red-600"}`}>
                  ({monthlyAchievement}%)
                </span>
              )}
              <div className="flex items-center gap-1.5">
                {positiveCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                    <TrendingUp size={10} />{positiveCount}
                  </span>
                )}
                {negativeCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-red-600">
                    <TrendingDown size={10} />{negativeCount}
                  </span>
                )}
              </div>
              {person.aiFactors.some((f) => f.isEditRequested) && viewRole === "admin" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200">
                  <Edit3 size={9} />
                  수정요청 {person.aiFactors.filter((f) => f.isEditRequested).length}건
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-5 space-y-0">
          {!canEdit && (
            <div className="flex items-center gap-1 mb-4 text-[10px] text-text-secondary/50">
              <Lock size={10} />
              읽기 전용
            </div>
          )}

          <MonthlyScorecards channels={person.channels} />
          <WeeklyTable channels={person.channels} />

          <ActionSection
            actions={person.actions}
            keyMetrics={person.keyMetrics}
            onAdd={onAddAction}
            onRemove={onRemoveAction}
            readOnly={!canEdit}
          />

          <AIFactorsPanel
            factors={person.aiFactors}
            onRequestEdit={onRequestFactorEdit}
            onSaveEdit={onSaveFactorEdit}
            onCancelEdit={onCancelFactorEdit}
            onEditChange={onFactorEditChange}
            isAdmin={viewRole === "admin"}
          />
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────

function WeekSelector({ week, onPrev, onNext }: { week: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-border rounded-lg px-1">
      <button onClick={onPrev} className="p-1.5 hover:bg-surface rounded transition-colors">
        <ChevronLeft size={14} className="text-text-secondary" />
      </button>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Calendar size={13} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary whitespace-nowrap">{week}</span>
      </div>
      <button onClick={onNext} className="p-1.5 hover:bg-surface rounded transition-colors">
        <ChevronRight size={14} className="text-text-secondary" />
      </button>
    </div>
  );
}

function TeamSummaryBar({ people }: { people: PersonReport[] }) {
  const totalCM = people.reduce((s, p) => s + p.currentWeekTotal, 0);
  const prevCM = people.reduce((s, p) => s + p.prevWeekTotal, 0);
  const changeRate = prevCM > 0 ? ((totalCM - prevCM) / prevCM) * 100 : 0;
  const monthlyCum = people.reduce((s, p) => s + p.totalMonthlyCM, 0);
  const submitted = people.filter((p) => p.submitted || p.actions.length > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      <div className="bg-surface-card rounded-xl border border-border p-4">
        <p className="text-[11px] text-text-secondary font-medium mb-1">이번주 공헌이익</p>
        <p className="text-lg font-bold text-text-primary tabular-nums">{formatKRW(totalCM)}</p>
      </div>
      <div className="bg-surface-card rounded-xl border border-border p-4">
        <p className="text-[11px] text-text-secondary font-medium mb-1">전주 대비</p>
        <p className={`text-lg font-bold tabular-nums ${changeRate > 0 ? "text-emerald-600" : changeRate < 0 ? "text-red-600" : "text-text-primary"}`}>
          {changeRate > 0 ? "+" : ""}{changeRate.toFixed(1)}%
        </p>
      </div>
      <div className="bg-surface-card rounded-xl border border-border p-4">
        <p className="text-[11px] text-text-secondary font-medium mb-1">월 누적 공헌이익</p>
        <p className="text-lg font-bold text-text-primary tabular-nums">{formatKRW(monthlyCum)}</p>
      </div>
      <div className="bg-surface-card rounded-xl border border-border p-4">
        <p className="text-[11px] text-text-secondary font-medium mb-1">인원</p>
        <p className="text-lg font-bold text-text-primary">{people.length}명</p>
      </div>
      <div className="bg-surface-card rounded-xl border border-border p-4">
        <p className="text-[11px] text-text-secondary font-medium mb-1">작성 현황</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold text-text-primary">{submitted}/{people.length}</p>
          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${people.length > 0 ? (submitted / people.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewModeSelector({ viewRole, onChange }: { viewRole: ViewRole; onChange: (role: ViewRole) => void }) {
  const options: { key: ViewRole; label: string; icon: typeof Eye }[] = [
    { key: "member", label: "내 보고", icon: User },
    { key: "admin", label: "관리자", icon: Eye },
  ];
  return (
    <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = viewRole === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-white text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Icon size={12} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AdminSubTabSelector({ subTab, onChange }: { subTab: AdminSubTab; onChange: (tab: AdminSubTab) => void }) {
  const tabs: { key: AdminSubTab; label: string; icon: typeof BarChart3 }[] = [
    { key: "aggregate", label: "취합", icon: BarChart3 },
    { key: "settings", label: "설정", icon: Settings },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border mb-5">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${subTab === t.key ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"}`}
          >
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Scorecard Settings ─────────────────────────────────────

function ScorecardSettings({ configs, onUpdate }: { configs: ScorecardConfig[]; onUpdate: (configs: ScorecardConfig[]) => void }) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(configs[0]?.email ?? null);
  const selectedConfig = configs.find((c) => c.email === selectedEmail);
  const teams = [...new Set(configs.map((c) => c.team))];

  function addMetric(email: string, metric: string) {
    onUpdate(configs.map((c) => c.email === email ? { ...c, metrics: [...c.metrics, metric] } : c));
  }
  function removeMetric(email: string, metric: string) {
    onUpdate(configs.map((c) => c.email === email ? { ...c, metrics: c.metrics.filter((m) => m !== metric) } : c));
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-text-primary">담당자별 스코어카드 설정</h3>
        <p className="text-xs text-text-secondary mt-1">각 담당자가 추적할 채널(지표)을 지정합니다</p>
      </div>
      <div className="flex min-h-[400px]">
        <div className="w-52 border-r border-border bg-surface/30 shrink-0">
          {teams.map((team) => (
            <div key={team}>
              <div className="px-4 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-surface/50">{team}</div>
              {configs.filter((c) => c.team === team).map((c) => (
                <button
                  key={c.email}
                  onClick={() => setSelectedEmail(c.email)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-2 ${selectedEmail === c.email ? "bg-white border-accent text-accent font-medium" : "border-transparent text-text-primary hover:bg-surface/50"}`}
                >
                  <span className="block">{c.name}</span>
                  <span className="block text-[11px] text-text-secondary mt-0.5">{c.metrics.length}개 지표</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex-1 p-5">
          {selectedConfig ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <User size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{selectedConfig.name}</p>
                  <p className="text-xs text-text-secondary">{selectedConfig.team} · {selectedConfig.email}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">할당된 스코어카드 지표</p>
                <div className="space-y-2">
                  {selectedConfig.metrics.map((metric, idx) => (
                    <div key={metric} className="flex items-center justify-between px-4 py-3 bg-white border border-border rounded-lg group">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-text-secondary/50 tabular-nums w-5">{idx + 1}</span>
                        <span className="text-sm font-medium text-text-primary">{metric}</span>
                      </div>
                      <button onClick={() => removeMetric(selectedConfig.email, metric)} className="p-1 rounded hover:bg-red-50 text-text-secondary/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {selectedConfig.metrics.length === 0 && (
                    <div className="text-center py-8 text-sm text-text-secondary/50">할당된 지표가 없습니다</div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">추가 가능한 지표</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_METRICS.filter((m) => !selectedConfig.metrics.includes(m)).map((metric) => (
                    <button key={metric} onClick={() => addMetric(selectedConfig.email, metric)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-colors">
                      <Plus size={14} />
                      {metric}
                    </button>
                  ))}
                  {AVAILABLE_METRICS.filter((m) => !selectedConfig.metrics.includes(m)).length === 0 && (
                    <p className="text-xs text-text-secondary/50">모든 지표가 할당되었습니다</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-secondary/50">담당자를 선택하세요</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function PerformancePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  const [tab, setTab] = useState<Tab>("brand");
  const [weekLabel] = useState("2026년 9월 1주차");
  const [people, setPeople] = useState<PersonReport[]>(MOCK_BRAND);

  const isAdmin = user?.role === "admin";
  const [viewRole, setViewRole] = useState<ViewRole>("member");
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>("aggregate");
  const [roleInitialized, setRoleInitialized] = useState(false);
  const [scorecardConfigs, setScorecardConfigs] = useState<ScorecardConfig[]>(MOCK_SCORECARD_CONFIGS);

  useEffect(() => {
    if (user && !roleInitialized) {
      setViewRole(user.role === "admin" ? "admin" : "member");
      setRoleInitialized(true);
    }
  }, [user, roleInitialized]);

  function handleAddAction(personIndex: number, metric: string, description: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIndex
          ? { ...p, actions: [...p.actions, { id: `a${Date.now()}`, metric, description }] }
          : p
      )
    );
  }

  function handleRemoveAction(personIndex: number, actionId: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIndex
          ? { ...p, actions: p.actions.filter((a) => a.id !== actionId) }
          : p
      )
    );
  }

  function handleRequestFactorEdit(personIndex: number, factorId: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIndex
          ? {
              ...p,
              aiFactors: p.aiFactors.map((f) =>
                f.id === factorId ? { ...f, isEditRequested: true, editedDescription: f.description } : f
              ),
            }
          : p
      )
    );
  }

  function handleSaveFactorEdit(personIndex: number, factorId: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIndex
          ? {
              ...p,
              aiFactors: p.aiFactors.map((f) =>
                f.id === factorId ? { ...f, description: f.editedDescription || f.description, isAiRecommended: false } : f
              ),
            }
          : p
      )
    );
  }

  function handleCancelFactorEdit(personIndex: number, factorId: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIndex
          ? {
              ...p,
              aiFactors: p.aiFactors.map((f) =>
                f.id === factorId ? { ...f, isEditRequested: false, editedDescription: "" } : f
              ),
            }
          : p
      )
    );
  }

  function handleFactorEditChange(personIndex: number, factorId: string, text: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIndex
          ? {
              ...p,
              aiFactors: p.aiFactors.map((f) =>
                f.id === factorId ? { ...f, editedDescription: text } : f
              ),
            }
          : p
      )
    );
  }

  const visiblePeople = viewRole === "member"
    ? people.filter((p) => p.email === user?.email)
    : people;

  const submitted = people.filter((p) => p.submitted || p.actions.length > 0).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">주간 성과 보고</h1>
          <p className="text-sm text-text-secondary mt-1">채널별 공헌이익 확인 및 주간 액션 작성</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WeekSelector week={weekLabel} onPrev={() => {}} onNext={() => {}} />
          {viewRole === "member" && (
            <button
              disabled={visiblePeople.length === 0 || visiblePeople.every((p) => p.actions.length === 0)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              제출
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="mb-5">
          <ViewModeSelector viewRole={viewRole} onChange={setViewRole} />
        </div>
      )}

      {viewRole === "admin" && (
        <AdminSubTabSelector subTab={adminSubTab} onChange={setAdminSubTab} />
      )}

      {(viewRole === "member" || adminSubTab === "aggregate") && (
        <>
          <div className="flex items-start gap-3 mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-0.5">데이터 연동 준비 중</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                현재 샘플 데이터가 표시됩니다. Google Sheets 연동이 완료되면 실제 채널별 공헌이익이 자동으로 표시됩니다.
              </p>
            </div>
          </div>

          {viewRole === "admin" && (
            <div className="flex items-center gap-1 mb-5 border-b border-border overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 md:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded-full">{t.count}</span>
                </button>
              ))}
            </div>
          )}

          <TeamSummaryBar people={visiblePeople} />

          <div className="space-y-4">
            {visiblePeople.map((person) => {
              const realIndex = people.indexOf(person);
              return (
                <PersonCard
                  key={person.email}
                  person={person}
                  onAddAction={(m, d) => handleAddAction(realIndex, m, d)}
                  onRemoveAction={(id) => handleRemoveAction(realIndex, id)}
                  onRequestFactorEdit={(fid) => handleRequestFactorEdit(realIndex, fid)}
                  onSaveFactorEdit={(fid) => handleSaveFactorEdit(realIndex, fid)}
                  onCancelFactorEdit={(fid) => handleCancelFactorEdit(realIndex, fid)}
                  onFactorEditChange={(fid, text) => handleFactorEditChange(realIndex, fid, text)}
                  viewRole={viewRole}
                  isOwnCard={person.email === user?.email}
                />
              );
            })}
          </div>

          {viewRole === "admin" && (
            <div className="mt-6 bg-surface-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BarChart3 size={14} className="text-accent" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">주간 트렌드</h3>
              </div>
              <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg bg-surface/50">
                <p className="text-xs text-text-secondary">데이터 연동 후 주간 공헌이익 추이 차트가 표시됩니다</p>
              </div>
            </div>
          )}
        </>
      )}

      {viewRole === "admin" && adminSubTab === "settings" && (
        <ScorecardSettings configs={scorecardConfigs} onUpdate={setScorecardConfigs} />
      )}
    </div>
  );
}
