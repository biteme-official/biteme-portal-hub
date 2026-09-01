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
  MessageSquare,
  X,
  Eye,
  Lock,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type MetricStatus = "긍정" | "부정" | "유지";
type OverrideStatus = "none" | "pending" | "approved" | "rejected";
type ViewRole = "admin" | "member";
type AdminSubTab = "aggregate" | "settings";

interface ScorecardConfig {
  email: string;
  name: string;
  team: string;
  metrics: string[];
}

const AVAILABLE_METRICS = [
  "자사몰", "스마트스토어", "쿠팡", "B2B", "해외", "그외", "온라인채널",
];

const MOCK_SCORECARD_CONFIGS: ScorecardConfig[] = [
  { email: "jiyun@biteme.co.kr", name: "이지윤", team: "브랜드팀", metrics: ["자사몰", "스마트스토어", "쿠팡"] },
  { email: "sohee@biteme.co.kr", name: "김소희", team: "브랜드팀", metrics: ["자사몰", "스마트스토어", "B2B"] },
  { email: "hasun@biteme.co.kr", name: "유하선", team: "브랜드팀", metrics: ["자사몰", "온라인채널"] },
];

interface ChannelMetric {
  channel: string;
  steady: number | null;
  seasonal: number | null;
  total: number;
  prevTotal: number;
  changeRate: number;
  status: MetricStatus;
  monthlyCumulative: number;
  monthlyTarget: number | null;
  monthlyAchievement: number | null;
}

interface PersonReport {
  name: string;
  position: string;
  team: string;
  division: string;
  email: string;
  channels: ChannelMetric[];
  totalCM: number;
  prevTotalCM: number;
  totalChangeRate: number;
  monthlyCumulativeCM: number;
  monthlyTargetCM: number | null;
  overallStatus: MetricStatus;
  overrideStatus: OverrideStatus;
  overrideReason: string;
  action: string;
  submitted: boolean;
}

type Tab = "brand" | "growth" | "all";

const TABS: { key: Tab; label: string; count: number }[] = [
  { key: "brand", label: "브랜드팀", count: 3 },
  { key: "growth", label: "그로스팀", count: 4 },
  { key: "all", label: "전사", count: 7 },
];

const MOCK_BRAND: PersonReport[] = [
  {
    name: "이지윤",
    position: "MD",
    team: "브랜드팀",
    division: "프로핏",
    email: "jiyun@biteme.co.kr",
    channels: [
      { channel: "자사몰", steady: 4200000, seasonal: 1800000, total: 6000000, prevTotal: 5500000, changeRate: 9.1, status: "긍정", monthlyCumulative: 22500000, monthlyTarget: 25000000, monthlyAchievement: 90 },
      { channel: "스마트스토어", steady: 3100000, seasonal: 900000, total: 4000000, prevTotal: 4200000, changeRate: -4.8, status: "부정", monthlyCumulative: 16800000, monthlyTarget: 18000000, monthlyAchievement: 93.3 },
      { channel: "쿠팡", steady: 1500000, seasonal: 500000, total: 2000000, prevTotal: 2000000, changeRate: 0, status: "유지", monthlyCumulative: 8200000, monthlyTarget: 9000000, monthlyAchievement: 91.1 },
    ],
    totalCM: 12000000,
    prevTotalCM: 11700000,
    totalChangeRate: 2.6,
    monthlyCumulativeCM: 47500000,
    monthlyTargetCM: 52000000,
    overallStatus: "긍정",
    overrideStatus: "none",
    overrideReason: "",
    action: "",
    submitted: false,
  },
  {
    name: "김소희",
    position: "MD",
    team: "브랜드팀",
    division: "프로핏",
    email: "sohee@biteme.co.kr",
    channels: [
      { channel: "자사몰", steady: 3800000, seasonal: 1200000, total: 5000000, prevTotal: 4600000, changeRate: 8.7, status: "긍정", monthlyCumulative: 19200000, monthlyTarget: 20000000, monthlyAchievement: 96 },
      { channel: "스마트스토어", steady: 2800000, seasonal: 700000, total: 3500000, prevTotal: 3500000, changeRate: 0, status: "유지", monthlyCumulative: 14000000, monthlyTarget: 15000000, monthlyAchievement: 93.3 },
      { channel: "B2B", steady: 1000000, seasonal: null, total: 1000000, prevTotal: 800000, changeRate: 25.0, status: "긍정", monthlyCumulative: 3800000, monthlyTarget: 4000000, monthlyAchievement: 95 },
    ],
    totalCM: 9500000,
    prevTotalCM: 8900000,
    totalChangeRate: 6.7,
    monthlyCumulativeCM: 37000000,
    monthlyTargetCM: 39000000,
    overallStatus: "긍정",
    overrideStatus: "none",
    overrideReason: "",
    action: "",
    submitted: false,
  },
  {
    name: "유하선",
    position: "MD",
    team: "브랜드팀",
    division: "프로핏",
    email: "hasun@biteme.co.kr",
    channels: [
      { channel: "자사몰", steady: 2900000, seasonal: 1100000, total: 4000000, prevTotal: 4300000, changeRate: -7.0, status: "부정", monthlyCumulative: 15600000, monthlyTarget: 18000000, monthlyAchievement: 86.7 },
      { channel: "온라인채널", steady: 1800000, seasonal: 400000, total: 2200000, prevTotal: 2100000, changeRate: 4.8, status: "긍정", monthlyCumulative: 8800000, monthlyTarget: 9000000, monthlyAchievement: 97.8 },
    ],
    totalCM: 6200000,
    prevTotalCM: 6400000,
    totalChangeRate: -3.1,
    monthlyCumulativeCM: 24400000,
    monthlyTargetCM: 27000000,
    overallStatus: "부정",
    overrideStatus: "none",
    overrideReason: "",
    action: "",
    submitted: false,
  },
];

function formatKRW(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${Math.round(value / 10000).toLocaleString()}만`;
  }
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

function OverallStatusBadge({
  status,
  overrideStatus,
  onRequestOverride,
  editable,
}: {
  status: MetricStatus;
  overrideStatus: OverrideStatus;
  onRequestOverride: () => void;
  editable: boolean;
}) {
  const label = {
    none: null,
    pending: { text: "수정 요청 중", cls: "text-amber-600 bg-amber-50 border-amber-200" },
    approved: { text: "수정 승인", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    rejected: { text: "수정 반려", cls: "text-red-600 bg-red-50 border-red-200" },
  };

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      <span className="text-[10px] text-text-secondary/60">자동 판별</span>
      {overrideStatus !== "none" && label[overrideStatus] && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${label[overrideStatus]!.cls}`}>
          {label[overrideStatus]!.text}
        </span>
      )}
      {editable && overrideStatus === "none" && (
        <button
          onClick={onRequestOverride}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-text-secondary hover:text-accent hover:bg-accent/5 border border-border transition-colors"
        >
          <MessageSquare size={10} />
          수정 요청
        </button>
      )}
    </div>
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

function OverrideModal({
  personName,
  currentStatus,
  onClose,
  onSubmit,
}: {
  personName: string;
  currentStatus: MetricStatus;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-border shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">상태 수정 요청</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg transition-colors">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">대상</p>
            <p className="text-sm font-medium text-text-primary">{personName}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">현재 자동 판별 상태</p>
            <StatusBadge status={currentStatus} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">
              수정 사유
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="자동 판별된 상태가 부정확한 이유를 설명해주세요. (예: 반품 건 제외 시 실제 긍정)"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:bg-surface rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            disabled={reason.trim().length === 0}
            onClick={() => onSubmit(reason)}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            수정 요청
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonCard({
  person,
  onActionChange,
  onRequestOverride,
  viewRole,
  isOwnCard,
}: {
  person: PersonReport;
  onActionChange: (value: string) => void;
  onRequestOverride: () => void;
  viewRole: ViewRole;
  isOwnCard: boolean;
}) {
  const [expanded, setExpanded] = useState(isOwnCard);
  const positiveCount = person.channels.filter((c) => c.status === "긍정").length;
  const negativeCount = person.channels.filter((c) => c.status === "부정").length;
  const canEdit = isOwnCard || viewRole === "admin";
  const monthlyAchievement = person.monthlyTargetCM
    ? Math.round((person.monthlyCumulativeCM / person.monthlyTargetCM) * 100)
    : null;

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
                이번주 <span className="font-semibold text-text-primary">{formatKRW(person.totalCM)}</span>
              </span>
              <ChangeRate rate={person.totalChangeRate} />
              <span className="text-[10px] text-text-secondary/60">|</span>
              <span className="text-xs text-text-secondary">
                월 누적 <span className="font-semibold text-text-primary">{formatKRW(person.monthlyCumulativeCM)}</span>
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
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
      </div>

      {expanded && (
        <div className="border-t border-border">
          <div className="px-5 py-3 bg-surface/30 border-b border-border/50 flex items-center justify-between flex-wrap gap-2">
            <OverallStatusBadge
              status={person.overallStatus}
              overrideStatus={person.overrideStatus}
              onRequestOverride={onRequestOverride}
              editable={canEdit}
            />
            {!canEdit && (
              <span className="inline-flex items-center gap-1 text-[10px] text-text-secondary/50">
                <Lock size={10} />
                읽기 전용
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/70">
                  <th className="text-left text-[11px] font-semibold text-text-secondary px-5 py-2.5 uppercase tracking-wider">채널</th>
                  <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">스테디</th>
                  <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">시즈널</th>
                  <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">이번주</th>
                  <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">전주</th>
                  <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">변화</th>
                  <th className="text-right text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">월 누적</th>
                  <th className="text-center text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">달성률</th>
                  <th className="text-center text-[11px] font-semibold text-text-secondary px-3 py-2.5 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody>
                {person.channels.map((ch) => (
                  <tr key={ch.channel} className="border-t border-border/50 hover:bg-surface/30 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-text-primary">{ch.channel}</td>
                    <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">
                      {ch.steady !== null ? formatKRW(ch.steady) : <span className="text-text-secondary/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">
                      {ch.seasonal !== null ? formatKRW(ch.seasonal) : <span className="text-text-secondary/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-text-primary tabular-nums">{formatKRW(ch.total)}</td>
                    <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">{formatKRW(ch.prevTotal)}</td>
                    <td className="px-3 py-2.5 text-right"><ChangeRate rate={ch.changeRate} /></td>
                    <td className="px-3 py-2.5 text-right font-medium text-text-primary tabular-nums">{formatKRW(ch.monthlyCumulative)}</td>
                    <td className="px-3 py-2.5"><AchievementBar value={ch.monthlyAchievement} /></td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge status={ch.status} /></td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-surface/50">
                  <td className="px-5 py-2.5 font-bold text-text-primary">합계</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right font-bold text-text-primary tabular-nums">{formatKRW(person.totalCM)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-text-secondary tabular-nums">{formatKRW(person.prevTotalCM)}</td>
                  <td className="px-3 py-2.5 text-right"><ChangeRate rate={person.totalChangeRate} /></td>
                  <td className="px-3 py-2.5 text-right font-bold text-text-primary tabular-nums">{formatKRW(person.monthlyCumulativeCM)}</td>
                  <td className="px-3 py-2.5">
                    <AchievementBar value={person.monthlyTargetCM ? Math.round((person.monthlyCumulativeCM / person.monthlyTargetCM) * 100) : null} />
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>

          {canEdit ? (
            <div className="p-5 border-t border-border">
              <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                이번 주 액션
              </label>
              <textarea
                value={person.action}
                onChange={(e) => onActionChange(e.target.value)}
                placeholder="이번 주 수행한 액션과 다음 주 계획을 입력하세요..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent resize-none"
              />
            </div>
          ) : person.action ? (
            <div className="p-5 border-t border-border">
              <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">이번 주 액션</p>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{person.action}</p>
            </div>
          ) : null}

          <div className="px-5 pb-4">
            <div className="flex items-start gap-2.5 p-3 bg-accent/5 border border-accent/15 rounded-lg">
              <Sparkles size={14} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-accent mb-0.5">AI 분석</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  데이터가 연결되면 자동으로 성과 분석 및 인사이트가 생성됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekSelector({
  week,
  onPrev,
  onNext,
}: {
  week: string;
  onPrev: () => void;
  onNext: () => void;
}) {
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
  const totalCM = people.reduce((s, p) => s + p.totalCM, 0);
  const prevCM = people.reduce((s, p) => s + p.prevTotalCM, 0);
  const changeRate = prevCM > 0 ? ((totalCM - prevCM) / prevCM) * 100 : 0;
  const monthlyCum = people.reduce((s, p) => s + p.monthlyCumulativeCM, 0);
  const submitted = people.filter((p) => p.submitted || p.action.trim().length > 0).length;

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
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${people.length > 0 ? (submitted / people.length) * 100 : 0}%` }}
            />
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              active
                ? "bg-white text-accent shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
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
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ScorecardSettings({
  configs,
  onUpdate,
}: {
  configs: ScorecardConfig[];
  onUpdate: (configs: ScorecardConfig[]) => void;
}) {
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
              <div className="px-4 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-surface/50">
                {team}
              </div>
              {configs.filter((c) => c.team === team).map((c) => (
                <button
                  key={c.email}
                  onClick={() => setSelectedEmail(c.email)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-2 ${
                    selectedEmail === c.email
                      ? "bg-white border-accent text-accent font-medium"
                      : "border-transparent text-text-primary hover:bg-surface/50"
                  }`}
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
                    <div
                      key={metric}
                      className="flex items-center justify-between px-4 py-3 bg-white border border-border rounded-lg group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-text-secondary/50 tabular-nums w-5">{idx + 1}</span>
                        <span className="text-sm font-medium text-text-primary">{metric}</span>
                      </div>
                      <button
                        onClick={() => removeMetric(selectedConfig.email, metric)}
                        className="p-1 rounded hover:bg-red-50 text-text-secondary/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {selectedConfig.metrics.length === 0 && (
                    <div className="text-center py-8 text-sm text-text-secondary/50">
                      할당된 지표가 없습니다
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">추가 가능한 지표</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_METRICS.filter((m) => !selectedConfig.metrics.includes(m)).map((metric) => (
                    <button
                      key={metric}
                      onClick={() => addMetric(selectedConfig.email, metric)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
                    >
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
            <div className="flex items-center justify-center h-full text-sm text-text-secondary/50">
              담당자를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  const [tab, setTab] = useState<Tab>("brand");
  const [weekLabel] = useState("2026년 8월 4주차");
  const [people, setPeople] = useState<PersonReport[]>(MOCK_BRAND);
  const [overrideModal, setOverrideModal] = useState<number | null>(null);

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

  function handleActionChange(index: number, value: string) {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, action: value } : p)));
  }

  function handleOverrideSubmit(index: number, reason: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, overrideStatus: "pending" as OverrideStatus, overrideReason: reason } : p
      )
    );
    setOverrideModal(null);
  }

  const submitted = people.filter((p) => p.submitted || p.action.trim().length > 0).length;
  const allSubmitted = submitted === people.length && people.length > 0;

  const visiblePeople = viewRole === "member"
    ? people.filter((p) => p.email === user?.email)
    : people;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">주간 성과 보고</h1>
          <p className="text-sm text-text-secondary mt-1">
            채널별 공헌이익 확인 및 주간 액션 작성
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WeekSelector
            week={weekLabel}
            onPrev={() => {}}
            onNext={() => {}}
          />
          {viewRole === "member" && (
            <button
              disabled={visiblePeople.length === 0 || visiblePeople.every((p) => p.action.trim().length === 0)}
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
                  className={`px-3 md:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? "border-accent text-accent"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded-full">
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <TeamSummaryBar people={visiblePeople} />

          <div className="space-y-4">
            {visiblePeople.map((person, i) => {
              const realIndex = people.indexOf(person);
              return (
                <PersonCard
                  key={person.name}
                  person={person}
                  onActionChange={(v) => handleActionChange(realIndex, v)}
                  onRequestOverride={() => setOverrideModal(realIndex)}
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

      {overrideModal !== null && (
        <OverrideModal
          personName={people[overrideModal].name}
          currentStatus={people[overrideModal].overallStatus}
          onClose={() => setOverrideModal(null)}
          onSubmit={(reason) => handleOverrideSubmit(overrideModal, reason)}
        />
      )}
    </div>
  );
}
