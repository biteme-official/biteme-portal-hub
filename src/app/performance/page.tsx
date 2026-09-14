"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  User,
  Users,
  Calendar,
  Eye,
  Plus,
  Trash2,
  Target,
  AlertCircle,
  Bot,
  PencilLine,
  Flag,
  Check,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  PEOPLE,
  DIVISIONS,
  TEAM_ORDER,
  type Person,
  type Metric,
  type MetricKind,
  type MetricUnit,
} from "./org-data";

// ─── Constants ──────────────────────────────────────────────

const WEEK_LABEL = "2026년 9월 2주차";
const MONTH_LABEL = "9월";
const CLOSE_DUE = "10~12일";

const KIND_META: Record<MetricKind, { label: string; color: string; bg: string; border: string }> = {
  auto: { label: "자동", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  monthly: { label: "월 1회", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  weekly: { label: "매주", color: "text-accent", bg: "bg-accent/10", border: "border-accent/30" },
  project: { label: "과제", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

const KIND_ORDER: MetricKind[] = ["monthly", "weekly", "project", "auto"];

// ─── Types ──────────────────────────────────────────────────

interface ActionItem {
  id: string;
  text: string;
  /** 막힌 일 — 도움이 필요한 항목 */
  blocked: boolean;
}

interface Entry {
  values: Record<string, number | null>;
  /** 지표 id → 그 지표에 대한 액션 */
  actions: Record<string, ActionItem[]>;
  /** 월간 지표·과제의 "이번 주 해당" 여부 */
  active: Record<string, boolean>;
  submitted: boolean;
}

// ─── Utilities ──────────────────────────────────────────────

function formatKRW(v: number): string {
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (Math.abs(v) >= 10000) return `${Math.round(v / 10000).toLocaleString()}만`;
  return v.toLocaleString();
}

function formatValue(v: number | null | undefined, unit: MetricUnit): string {
  if (v === null || v === undefined) return "—";
  if (unit === "currency") return formatKRW(v);
  if (unit === "percent") return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
  return v.toLocaleString();
}

function emptyEntry(): Entry {
  return { values: {}, actions: {}, active: {}, submitted: false };
}

function allActions(e: Entry): ActionItem[] {
  return Object.values(e.actions).flat();
}

/** 이번 주에 사람이 손대야 하는 지표만 */
function needsInput(m: Metric): boolean {
  return m.kind !== "auto";
}

/** 자동 집계 지표의 이번 주 / 직전 실적 (시트 동기화분) */
function syncedPair(m: Metric): { current: number | null; prev: number | null } {
  const ws = m.weeks ?? [];
  let ci = -1;
  for (let i = ws.length - 1; i >= 0; i--) {
    if (ws[i] !== null && ws[i] !== undefined) { ci = i; break; }
  }
  if (ci < 0) return { current: m.baseline, prev: null };
  let pi = -1;
  for (let i = ci - 1; i >= 0; i--) {
    if (ws[i] !== null && ws[i] !== undefined) { pi = i; break; }
  }
  return { current: ws[ci] as number, prev: pi >= 0 ? (ws[pi] as number) : null };
}

// ─── Small pieces ───────────────────────────────────────────

function KindBadge({ kind }: { kind: MetricKind }) {
  const c = KIND_META[kind];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.color} border ${c.border}`}>
      {kind === "auto" && <Bot size={9} />}
      {kind === "monthly" && <Calendar size={9} />}
      {kind === "weekly" && <PencilLine size={9} />}
      {kind === "project" && <Flag size={9} />}
      {c.label}
    </span>
  );
}

function WeekSelector({ week }: { week: string }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-border rounded-lg px-1">
      <button className="p-1.5 hover:bg-surface rounded transition-colors" aria-label="이전 주">
        <ChevronLeft size={14} className="text-text-secondary" />
      </button>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Calendar size={13} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary whitespace-nowrap">{week}</span>
      </div>
      <button className="p-1.5 hover:bg-surface rounded transition-colors" aria-label="다음 주">
        <ChevronRight size={14} className="text-text-secondary" />
      </button>
    </div>
  );
}

function Sparkline({ values, up }: { values: (number | null)[]; up: boolean | null }) {
  const pts = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null && p.v !== undefined);
  if (pts.length < 2) {
    return <div className="h-7 mt-2 flex items-center"><span className="text-[10px] text-text-secondary/40">추이 없음</span></div>;
  }

  const vs = pts.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || Math.abs(max) || 1;
  const W = 100;
  const H = 28;
  const n = Math.max(values.length - 1, 1);
  const xy = (p: { v: number; i: number }) => [
    (p.i / n) * W,
    H - 3 - ((p.v - min) / span) * (H - 6),
  ];
  const line = pts.map((p) => xy(p).join(",")).join(" ");
  const first = xy(pts[0]);
  const last = xy(pts[pts.length - 1]);
  const area = `${first[0]},${H} ${line} ${last[0]},${H}`;
  const stroke = up === null ? "#94a3b8" : up ? "#059669" : "#dc2626";
  const fill = up === null ? "#94a3b81f" : up ? "#0596691f" : "#dc26261f";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-7 mt-2" aria-hidden="true">
      <polygon points={area} fill={fill} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={last[0]}
        y1={last[1] - 3}
        x2={last[0]}
        y2={last[1] + 3}
        stroke={stroke}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─── 지표별 액션 ────────────────────────────────────────────

function MetricActions({
  actions,
  onAdd,
  onRemove,
  onToggleBlocked,
  readOnly,
}: {
  actions: ActionItem[];
  onAdd: (text: string, blocked: boolean) => void;
  onRemove: (id: string) => void;
  onToggleBlocked: (id: string) => void;
  readOnly: boolean;
}) {
  const [text, setText] = useState("");
  const [asBlocked, setAsBlocked] = useState(false);

  function add() {
    if (!text.trim()) return;
    onAdd(text.trim(), asBlocked);
    setText("");
    setAsBlocked(false);
  }

  return (
    <div>
      {actions.length > 0 && (
        <div className="mb-1.5">
          {actions.map((a) => (
            <div key={a.id} className="flex items-start gap-2 py-1 group">
              <span className={`w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 ${a.blocked ? "bg-amber-500" : "bg-text-secondary/40"}`} />
              <span className={`text-[13px] leading-relaxed flex-1 ${a.blocked ? "text-amber-900" : "text-text-primary"}`}>
                {a.text}
              </span>
              {a.blocked && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                  막힘
                </span>
              )}
              {!readOnly && (
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggleBlocked(a.id)}
                    title={a.blocked ? "막힘 해제" : "막힘으로 표시"}
                    className={`p-0.5 rounded transition-colors ${a.blocked ? "text-amber-600 hover:bg-amber-50" : "text-text-secondary/40 hover:text-amber-600 hover:bg-amber-50"}`}
                  >
                    <Flag size={11} />
                  </button>
                  <button
                    onClick={() => onRemove(a.id)}
                    className="p-0.5 rounded hover:bg-red-50 text-text-secondary/40 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="이 지표에 대한 액션"
            className="flex-1 min-w-0 px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => setAsBlocked(!asBlocked)}
            title="막힌 일로 등록"
            className={`p-1.5 rounded-md border transition-colors shrink-0 ${asBlocked ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-border text-text-secondary/50 hover:text-amber-600 hover:border-amber-300"}`}
          >
            <Flag size={13} />
          </button>
          <button
            onClick={add}
            disabled={!text.trim()}
            className="p-1.5 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Plus size={13} />
          </button>
        </div>
      ) : (
        actions.length === 0 && <p className="text-[11px] text-text-secondary/50">등록된 액션 없음</p>
      )}
    </div>
  );
}

// ─── ① 주간 지표 (매주 확인) ────────────────────────────────

function WeeklyMetricTile({
  metric,
  value,
  onChange,
  actions,
  onActionAdd,
  onActionRemove,
  onActionToggleBlocked,
  readOnly,
}: {
  metric: Metric;
  value: number | null | undefined;
  onChange: (raw: string) => void;
  actions: ActionItem[];
  onActionAdd: (text: string, blocked: boolean) => void;
  onActionRemove: (id: string) => void;
  onActionToggleBlocked: (id: string) => void;
  readOnly: boolean;
}) {
  const isAuto = metric.kind === "auto";
  const synced = syncedPair(metric);
  const current = isAuto ? synced.current : (value ?? null);
  const prev = isAuto ? synced.prev : metric.baseline;

  const delta = current !== null && prev !== null && prev !== 0
    ? metric.unit === "percent" ? current - prev : ((current - prev) / Math.abs(prev)) * 100
    : null;
  const up = delta === null ? null : delta >= 0;

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] text-text-secondary leading-snug flex-1">{metric.name}</p>
          {isAuto
            ? <Lock size={10} className="text-text-secondary/30 mt-0.5 shrink-0" />
            : <KindBadge kind={metric.kind} />}
        </div>

        <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
          {isAuto ? (
            <span className="text-lg font-bold text-text-primary tabular-nums leading-none">
              {formatValue(current, metric.unit)}
            </span>
          ) : (
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                disabled={readOnly}
                value={value !== null && value !== undefined ? String(value) : ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="—"
                className="w-24 pl-2 pr-7 py-1 text-base font-bold text-right tabular-nums border border-border rounded-md bg-white text-text-primary placeholder:text-text-secondary/40 placeholder:font-normal focus:outline-none focus:border-accent disabled:bg-surface/60"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary pointer-events-none">
                {metric.unit === "percent" ? "%" : metric.unit === "currency" ? "원" : "건"}
              </span>
            </div>
          )}
          {delta !== null ? (
            <span className={`text-[11px] font-semibold tabular-nums ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-text-secondary"}`}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta).toFixed(1)}{metric.unit === "percent" ? "%p" : "%"}
            </span>
          ) : (
            <span className="text-[11px] text-text-secondary/50">
              {isAuto ? "전주 없음" : `상반기 ${formatValue(metric.baseline, metric.unit)}`}
            </span>
          )}
        </div>

        {isAuto && <Sparkline values={metric.weeks ?? []} up={up} />}
        {metric.note && <p className="text-[10px] text-amber-700 mt-1.5 leading-snug">{metric.note}</p>}
      </div>

      <div className="px-3.5 py-2.5 border-t border-border/60 bg-surface/30 mt-auto">
        <MetricActions
          actions={actions}
          onAdd={onActionAdd}
          onRemove={onActionRemove}
          onToggleBlocked={onActionToggleBlocked}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

// ─── ② 월간 지표 · 과제 (해당 주에만) ───────────────────────

function MonthlyMetricRow({
  metric,
  active,
  onToggleActive,
  value,
  onChange,
  actions,
  onActionAdd,
  onActionRemove,
  onActionToggleBlocked,
  readOnly,
}: {
  metric: Metric;
  active: boolean;
  onToggleActive: () => void;
  value: number | null | undefined;
  onChange: (raw: string) => void;
  actions: ActionItem[];
  onActionAdd: (text: string, blocked: boolean) => void;
  onActionRemove: (id: string) => void;
  onActionToggleBlocked: (id: string) => void;
  readOnly: boolean;
}) {
  const isClose = metric.kind === "monthly";
  const entered = value !== null && value !== undefined;
  const delay = isClose && entered ? Math.max(0, (value as number) - 12) : 0;

  return (
    <div className={`rounded-lg border overflow-hidden ${active ? "border-accent/40 bg-white" : "border-border bg-surface/30"}`}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <button
          onClick={onToggleActive}
          disabled={readOnly}
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors disabled:cursor-not-allowed ${active ? "bg-accent border-accent" : "bg-white border-border hover:border-accent"}`}
          aria-label={active ? "이번 주 해당 해제" : "이번 주 진행으로 표시"}
        >
          {active && <Check size={11} className="text-white" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm ${active ? "text-text-primary font-medium" : "text-text-secondary"}`}>
              {metric.name}
            </span>
            <KindBadge kind={metric.kind} />
            {metric.scopes && metric.scopes.length > 0 && (
              <span className="text-[10px] text-text-secondary/70">{metric.scopes.length}개 품목</span>
            )}
          </div>
          {!active && (
            <p className="text-[11px] text-text-secondary/60 mt-0.5">
              이번 주 해당 없음 — 진행했다면 체크
            </p>
          )}
        </div>

        {active && isClose && entered && (
          <span className={`text-[11px] font-semibold shrink-0 ${delay === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {delay === 0 ? "준수" : `지연 ${delay}일`}
          </span>
        )}
      </div>

      {active && (
        <div className="px-3.5 pb-3 pt-0.5 border-t border-border/50">
          <div className="flex items-center gap-2.5 py-2.5 flex-wrap">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              {isClose ? "완료일" : "진척"}
            </span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                disabled={readOnly}
                value={entered ? String(value) : ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="—"
                className="w-20 pl-2.5 pr-6 py-1.5 text-sm text-right tabular-nums border border-border rounded-md bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent disabled:bg-surface/60"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary pointer-events-none">
                {isClose ? "일" : "%"}
              </span>
            </div>
            <span className="text-[11px] text-text-secondary">
              {isClose ? `${MONTH_LABEL} 마감 목표 ${CLOSE_DUE}` : `상반기 ${formatValue(metric.baseline, metric.unit)}`}
            </span>
          </div>

          <MetricActions
            actions={actions}
            onAdd={onActionAdd}
            onRemove={onActionRemove}
            onToggleBlocked={onActionToggleBlocked}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
}

// ─── 지표 섹션 ──────────────────────────────────────────────

function MetricsSection({
  person,
  entry,
  onValueChange,
  onToggleActive,
  onActionAdd,
  onActionRemove,
  onActionToggleBlocked,
  readOnly,
}: {
  person: Person;
  entry: Entry;
  onValueChange: (metricId: string, raw: string) => void;
  onToggleActive: (metricId: string) => void;
  onActionAdd: (metricId: string, text: string, blocked: boolean) => void;
  onActionRemove: (metricId: string, id: string) => void;
  onActionToggleBlocked: (metricId: string, id: string) => void;
  readOnly: boolean;
}) {
  const weekly = person.metrics.filter((m) => m.kind === "auto" || m.kind === "weekly");
  const monthly = person.metrics.filter((m) => m.kind === "monthly" || m.kind === "project");

  const weeklyActed = weekly.filter((m) => (entry.actions[m.id] ?? []).length > 0).length;
  const activeCount = monthly.filter((m) => entry.active[m.id]).length;

  return (
    <>
      {weekly.length > 0 && (
        <div className="border-b border-border">
          <div className="flex items-baseline gap-2.5 px-5 pt-4 pb-3">
            <span className="font-mono text-[11px] font-semibold text-accent">01</span>
            <h3 className="text-sm font-bold text-text-primary">주간 지표</h3>
            <span className="text-[11px] text-text-secondary/60">매주 확인</span>
            <span className="ml-auto text-[11px] text-text-secondary">
              액션 <span className="font-semibold text-text-primary tabular-nums">{weeklyActed}/{weekly.length}</span>
            </span>
          </div>
          <div className="px-5 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {weekly.map((m) => (
              <WeeklyMetricTile
                key={m.id}
                metric={m}
                value={entry.values[m.id]}
                onChange={(raw) => onValueChange(m.id, raw)}
                actions={entry.actions[m.id] ?? []}
                onActionAdd={(t, b) => onActionAdd(m.id, t, b)}
                onActionRemove={(id) => onActionRemove(m.id, id)}
                onActionToggleBlocked={(id) => onActionToggleBlocked(m.id, id)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}

      {monthly.length > 0 && (
        <div className="border-b border-border">
          <div className="flex items-baseline gap-2.5 px-5 pt-4 pb-3">
            <span className="font-mono text-[11px] font-semibold text-accent">
              {weekly.length > 0 ? "02" : "01"}
            </span>
            <h3 className="text-sm font-bold text-text-primary">월간 지표 · 과제</h3>
            <span className="text-[11px] text-text-secondary/60">해당 주에만</span>
            <span className="ml-auto text-[11px] text-text-secondary">
              이번 주 <span className="font-semibold text-text-primary tabular-nums">{activeCount}/{monthly.length}</span>
            </span>
          </div>
          <div className="px-5 pb-4 space-y-2">
            {monthly.map((m) => (
              <MonthlyMetricRow
                key={m.id}
                metric={m}
                active={!!entry.active[m.id]}
                onToggleActive={() => onToggleActive(m.id)}
                value={entry.values[m.id]}
                onChange={(raw) => onValueChange(m.id, raw)}
                actions={entry.actions[m.id] ?? []}
                onActionAdd={(t, b) => onActionAdd(m.id, t, b)}
                onActionRemove={(id) => onActionRemove(m.id, id)}
                onActionToggleBlocked={(id) => onActionToggleBlocked(m.id, id)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── 개인 뷰 ────────────────────────────────────────────────

function MyReport({
  person,
  entry,
  onValueChange,
  onToggleActive,
  onActionAdd,
  onActionRemove,
  onActionToggleBlocked,
  readOnly,
}: {
  person: Person;
  entry: Entry;
  onValueChange: (metricId: string, raw: string) => void;
  onToggleActive: (metricId: string) => void;
  onActionAdd: (metricId: string, text: string, blocked: boolean) => void;
  onActionRemove: (metricId: string, id: string) => void;
  onActionToggleBlocked: (metricId: string, id: string) => void;
  readOnly: boolean;
}) {
  if (person.metrics.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <Target size={20} className="text-text-secondary/40 mb-2" />
          <p className="text-sm text-text-secondary">할당된 Key Metric이 없습니다</p>
          <p className="text-xs text-text-secondary/60 mt-1">
            주간보고록에 기록이 없어 비어 있습니다 — 담당 지표 지정이 필요합니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden [&>div:last-child]:border-b-0">
      <MetricsSection
        person={person}
        entry={entry}
        onValueChange={onValueChange}
        onToggleActive={onToggleActive}
        onActionAdd={onActionAdd}
        onActionRemove={onActionRemove}
        onActionToggleBlocked={onActionToggleBlocked}
        readOnly={readOnly}
      />
    </div>
  );
}

// ─── 관리자 뷰 ──────────────────────────────────────────────

function KindTally({ metrics }: { metrics: Metric[] }) {
  const tally = KIND_ORDER
    .map((k) => ({ kind: k, n: metrics.filter((m) => m.kind === k).length }))
    .filter((t) => t.n > 0);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tally.map((t) => (
        <span
          key={t.kind}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${KIND_META[t.kind].bg} ${KIND_META[t.kind].color} ${KIND_META[t.kind].border}`}
        >
          {KIND_META[t.kind].label} {t.n}
        </span>
      ))}
    </div>
  );
}

function TeamCard({
  team,
  people,
  entries,
  onOpenPerson,
  defaultExpanded,
}: {
  team: string;
  people: Person[];
  entries: Record<string, Entry>;
  onOpenPerson: (email: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const allMetrics = people.flatMap((p) => p.metrics);
  const leader = people.find((p) => p.isLeader);
  const written = people.filter((p) => {
    const e = entries[p.email];
    return e && (e.submitted || allActions(e).length > 0 || Object.keys(e.values).length > 0);
  }).length;
  const inputCount = allMetrics.filter(needsInput).length;

  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-surface/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Users size={16} className="text-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-text-primary">{team}</span>
              <span className="text-[11px] text-text-secondary bg-surface px-2 py-0.5 rounded-full">{people.length}명</span>
              {leader && (
                <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">
                  {leader.position || "팀장"} {leader.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-text-secondary">
                지표 <span className="font-semibold text-text-primary tabular-nums">{allMetrics.length}</span>
                <span className="text-text-secondary/60"> · 입력 대상 </span>
                <span className="font-semibold text-text-primary tabular-nums">{inputCount}</span>
              </span>
              <KindTally metrics={allMetrics} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-text-secondary">작성</p>
            <p className="text-sm font-bold text-text-primary tabular-nums">{written}/{people.length}</p>
          </div>
          {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-surface/20 px-3 py-3 space-y-2">
          {people.map((p) => {
            const e = entries[p.email] ?? emptyEntry();
            const inputs = p.metrics.filter(needsInput);
            const filled = inputs.filter((m) => e.values[m.id] !== null && e.values[m.id] !== undefined).length;
            const acts = allActions(e);
            const hasWritten = acts.length > 0 || filled > 0;
            return (
              <div key={p.email} className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-border">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <User size={14} className="text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                    {p.position && (
                      <span className="text-[10px] text-text-secondary bg-surface px-1.5 py-0.5 rounded">{p.position}</span>
                    )}
                    {p.metrics.length === 0 && (
                      <span className="text-[10px] text-text-secondary/70 border border-border px-1.5 py-0.5 rounded">지표 미설정</span>
                    )}
                    {allActions(e).filter((a) => a.blocked).length > 0 && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        막힘 {allActions(e).filter((a) => a.blocked).length}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {p.scope && <span className="text-text-secondary/80">{p.scope} · </span>}
                    지표 {p.metrics.length}개 · 이번 주 입력 {filled}/{inputs.length}
                    {acts.length > 0 && ` · 액션 ${acts.length}건`}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0 ${hasWritten ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-text-secondary bg-surface border-border"}`}>
                  {hasWritten ? "작성 중" : "미작성"}
                </span>
                <button
                  onClick={() => onOpenPerson(p.email)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-text-secondary hover:text-accent hover:bg-accent/10 border border-border hover:border-accent/30 transition-colors shrink-0"
                >
                  <Eye size={12} />
                  개인 화면
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function PerformancePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const isAdmin = user?.role === "admin";
  const [view, setView] = useState<"member" | "admin">("admin");
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [previewEmail, setPreviewEmail] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});

  const targetEmail = previewEmail ?? user?.email ?? PEOPLE[0].email;
  const targetPerson = PEOPLE.find((p) => p.email === targetEmail) ?? PEOPLE[0];
  const isPreviewingOther = targetPerson.email !== user?.email;

  const divisionPeople = useMemo(() => PEOPLE.filter((p) => p.division === division), [division]);
  const divMetrics = divisionPeople.flatMap((p) => p.metrics);
  const autoShare = divMetrics.length > 0
    ? Math.round((divMetrics.filter((m) => m.kind === "auto").length / divMetrics.length) * 100)
    : 0;

  function getEntry(email: string): Entry {
    return entries[email] ?? emptyEntry();
  }

  function patchEntry(email: string, fn: (e: Entry) => Entry) {
    setEntries((prev) => ({ ...prev, [email]: fn(prev[email] ?? emptyEntry()) }));
  }

  function handleValueChange(email: string, metricId: string, raw: string) {
    const parsed = raw.trim() === "" ? null : Number(raw);
    patchEntry(email, (e) => ({
      ...e,
      values: { ...e.values, [metricId]: parsed === null || Number.isNaN(parsed) ? null : parsed },
    }));
  }

  function handleActionAdd(email: string, metricId: string, text: string, blocked: boolean) {
    patchEntry(email, (e) => ({
      ...e,
      actions: {
        ...e.actions,
        [metricId]: [...(e.actions[metricId] ?? []), { id: `a${Date.now()}`, text, blocked }],
      },
    }));
  }

  function handleActionRemove(email: string, metricId: string, id: string) {
    patchEntry(email, (e) => ({
      ...e,
      actions: { ...e.actions, [metricId]: (e.actions[metricId] ?? []).filter((a) => a.id !== id) },
    }));
  }

  function handleActionToggleBlocked(email: string, metricId: string, id: string) {
    patchEntry(email, (e) => ({
      ...e,
      actions: {
        ...e.actions,
        [metricId]: (e.actions[metricId] ?? []).map((a) =>
          a.id === id ? { ...a, blocked: !a.blocked } : a
        ),
      },
    }));
  }

  function handleToggleActive(email: string, metricId: string) {
    patchEntry(email, (e) => ({ ...e, active: { ...e.active, [metricId]: !e.active[metricId] } }));
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            주간 성과 보고
            {view === "member" && (
              <span className="ml-2 text-base font-semibold text-text-secondary">
                · {targetPerson.name}
                <span className="text-sm font-normal text-text-secondary/70"> {targetPerson.team}</span>
              </span>
            )}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {view === "member"
              ? targetPerson.scope
                ? `담당 ${targetPerson.scope}`
                : "지표와 액션 두 칸만 채우면 끝입니다"
              : "본부 · 팀별 작성 현황과 지표 구성"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WeekSelector week={WEEK_LABEL} />
          {view === "member" && !isPreviewingOther && (
            <button className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
              <Send size={14} />
              제출
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            <button
              onClick={() => setView("member")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "member" ? "bg-white text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              <User size={12} />
              개인 화면
            </button>
            <button
              onClick={() => setView("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "admin" ? "bg-white text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              <Eye size={12} />
              관리자
            </button>
          </div>

          {view === "member" && (
            <>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <select
                  value={targetEmail}
                  onChange={(e) => setPreviewEmail(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-xs font-medium border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                >
                  {DIVISIONS.map((div) => (
                    <optgroup key={div} label={div}>
                      {PEOPLE.filter((p) => p.division === div).map((p) => (
                        <option key={p.email} value={p.email}>
                          {p.team} · {p.name}{p.email === user?.email ? " (나)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
              {isPreviewingOther && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
                  <Eye size={11} />
                  미리보기 · 읽기 전용
                </span>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-0.5">프로토타입</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            지표 구성은 2~7월 주간보고록 3,547행에서 추출했습니다. MKT · 플랫폼팀은 그로스팀 개편으로 제외.
            자동 집계 지표는 시트 연동 후 채워지며, 입력값은 아직 저장되지 않습니다.
          </p>
        </div>
      </div>

      {view === "member" ? (
        <MyReport
          person={targetPerson}
          entry={getEntry(targetPerson.email)}
          onValueChange={(mid, raw) => handleValueChange(targetPerson.email, mid, raw)}
          onToggleActive={(mid) => handleToggleActive(targetPerson.email, mid)}
          onActionAdd={(mid, t, b) => handleActionAdd(targetPerson.email, mid, t, b)}
          onActionRemove={(mid, id) => handleActionRemove(targetPerson.email, mid, id)}
          onActionToggleBlocked={(mid, id) => handleActionToggleBlocked(targetPerson.email, mid, id)}
          readOnly={isPreviewingOther}
        />
      ) : (
        <>
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-surface-card rounded-xl border border-border p-4">
              <p className="text-[11px] text-text-secondary font-medium mb-1">인원</p>
              <p className="text-lg font-bold text-text-primary tabular-nums">{divisionPeople.length}명</p>
            </div>
            <div className="bg-surface-card rounded-xl border border-border p-4">
              <p className="text-[11px] text-text-secondary font-medium mb-1">Key Metric</p>
              <p className="text-lg font-bold text-text-primary tabular-nums">{divMetrics.length}개</p>
            </div>
            <div className="bg-surface-card rounded-xl border border-border p-4">
              <p className="text-[11px] text-text-secondary font-medium mb-1">자동 집계 비중</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{autoShare}%</p>
            </div>
            <div className="bg-surface-card rounded-xl border border-border p-4">
              <p className="text-[11px] text-text-secondary font-medium mb-1">주간 입력 대상</p>
              <p className="text-lg font-bold text-text-primary tabular-nums">{divMetrics.filter(needsInput).length}개</p>
            </div>
          </div>

          <div className="space-y-3">
            {(TEAM_ORDER[division] ?? []).map((team) => {
              const teamPeople = divisionPeople.filter((p) => p.team === team);
              if (teamPeople.length === 0) return null;
              return (
                <TeamCard
                  key={team}
                  team={team}
                  people={teamPeople}
                  entries={entries}
                  defaultExpanded={teamPeople.some((p) => p.email === user?.email)}
                  onOpenPerson={(email) => {
                    setPreviewEmail(email);
                    setView("member");
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
