"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Users, User, Database, Loader2, AlertCircle, Target, Building2 } from "lucide-react";
import { PEOPLE, TEAM_ORDER, DIVISIONS, type MetricUnit } from "./org-data";
import {
  SOURCE_ORDER,
  SOURCE_LABEL,
  CADENCE_ORDER,
  CADENCE_LABEL,
  GOAL_LEVEL_LABEL,
  teamGoalId,
  type MetricSetting,
  type MetricSource,
  type GoalSetting,
  type Period,
} from "./metric-settings-data";

const SOURCE_STYLE: Record<MetricSource, string> = {
  auto: "text-emerald-700 bg-emerald-50 border-emerald-200",
  connectable: "text-blue-700 bg-blue-50 border-blue-200",
  action: "text-accent bg-accent/10 border-accent/30",
  manual: "text-amber-700 bg-amber-50 border-amber-200",
};

const SOURCE_DESC: Record<MetricSource, string> = {
  auto: "시스템 데이터로 집계하던 지표",
  connectable: "지금은 수기지만 연동할 데이터가 있음",
  action: "완료 액션으로 판정 — 숫자 입력 없음",
  manual: "시스템 데이터 없음 — 입력 주체 결정 필요",
};

type SaveState = "saving" | "saved" | "error";

const selectBase = "px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:border-accent";
const selectCls = `${selectBase} border-border bg-white text-text-primary`;

function formatTarget(v: number, unit: MetricUnit): string {
  if (unit === "currency") {
    if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
    if (Math.abs(v) >= 10000) return `${Math.round(v / 10000).toLocaleString()}만`;
    return `${v.toLocaleString()}원`;
  }
  if (unit === "percent") return `${v}%`;
  return `${v.toLocaleString()}건`;
}

function SaveIndicator({ state }: { state?: SaveState }) {
  return (
    <span className="w-10 text-[10px] text-right shrink-0">
      {state === "saving" && <Loader2 size={11} className="inline animate-spin text-text-secondary" />}
      {state === "saved" && <span className="text-emerald-600">저장됨</span>}
      {state === "error" && <span className="text-red-600">실패</span>}
    </span>
  );
}

function SourceTally({ items }: { items: { source: MetricSource }[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SOURCE_ORDER.map((s) => {
        const n = items.filter((m) => m.source === s).length;
        if (n === 0) return null;
        return (
          <span key={s} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SOURCE_STYLE[s]}`}>
            {SOURCE_LABEL[s]} {n}
          </span>
        );
      })}
    </div>
  );
}

/** 분기 목표 입력 — 비우면 미확정(null) */
function TargetInput({
  value,
  unit,
  period,
  onSave,
}: {
  value: number | null | undefined;
  unit: MetricUnit;
  period: Period;
  onSave: (v: number | null) => void;
}) {
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));
  useEffect(() => setText(value === null || value === undefined ? "" : String(value)), [value, period]);

  function commit() {
    const parsed = text.trim() === "" ? null : Number(text);
    if (parsed !== null && Number.isNaN(parsed)) return;
    if (parsed === (value ?? null)) return;
    onSave(parsed);
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        placeholder="목표 미정"
        className="w-28 px-2 py-1.5 text-xs text-right tabular-nums border border-border rounded-md bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
      />
      <span className="w-12 text-[10px] text-text-secondary tabular-nums">
        {value !== null && value !== undefined ? formatTarget(value, unit) : ""}
      </span>
    </div>
  );
}

function GoalCard({
  goal,
  period,
  linkedCount,
  saveState,
  onSave,
}: {
  goal: GoalSetting;
  period: Period;
  linkedCount?: number;
  saveState?: SaveState;
  onSave: (patch: Partial<GoalSetting>) => void;
}) {
  const [name, setName] = useState(goal.name);
  const [note, setNote] = useState(goal.note);
  useEffect(() => setName(goal.name), [goal.name]);
  useEffect(() => setNote(goal.note), [goal.note]);

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 px-3.5 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent bg-white border border-accent/30 px-1.5 py-0.5 rounded">
          <Target size={9} /> {GOAL_LEVEL_LABEL[goal.level]} KPI
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== goal.name && onSave({ name })}
          className="flex-1 min-w-[10rem] px-2 py-1 text-sm font-semibold border border-transparent hover:border-border rounded-md bg-transparent text-text-primary focus:outline-none focus:border-accent focus:bg-white"
        />
        {linkedCount !== undefined && (
          <span className="text-[11px] text-text-secondary">연결 지표 {linkedCount}개</span>
        )}
        <SaveIndicator state={saveState} />
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <TargetInput
          value={goal.targets?.[period]}
          unit={goal.unit}
          period={period}
          onSave={(v) => onSave({ targets: { [period]: v } })}
        />
        <select
          value={goal.source}
          onChange={(e) => onSave({ source: e.target.value as MetricSource })}
          className={`${selectBase} font-semibold ${SOURCE_STYLE[goal.source]}`}
        >
          {SOURCE_ORDER.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== goal.note && onSave({ note })}
          placeholder="근거 · 확정 필요 사항"
          className="flex-1 min-w-[12rem] px-2 py-1.5 text-xs border border-border rounded-md bg-white text-text-secondary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}

function MetricRow({
  metric,
  period,
  teamGoals,
  saveState,
  onSave,
}: {
  metric: MetricSetting;
  period: Period;
  teamGoals: GoalSetting[];
  saveState?: SaveState;
  onSave: (patch: Partial<MetricSetting>) => void;
}) {
  const [name, setName] = useState(metric.name);
  const [note, setNote] = useState(metric.sourceNote);

  useEffect(() => setName(metric.name), [metric.name]);
  useEffect(() => setNote(metric.sourceNote), [metric.sourceNote]);

  const parentId = metric.parentGoalId ?? teamGoalId(metric.team);

  return (
    <div className="px-3 py-2.5 border-t border-border/50 first:border-t-0 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== metric.name && onSave({ name })}
          className="flex-1 min-w-[10rem] px-2 py-1.5 text-[13px] border border-transparent hover:border-border rounded-md bg-transparent text-text-primary focus:outline-none focus:border-accent focus:bg-white"
        />
        <TargetInput
          value={metric.targets?.[period]}
          unit={metric.unit}
          period={period}
          onSave={(v) => onSave({ targets: { [period]: v } })}
        />
        <select value={metric.cadence} onChange={(e) => onSave({ cadence: e.target.value as MetricSetting["cadence"] })} className={selectCls}>
          {CADENCE_ORDER.map((c) => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}
        </select>
        <select
          value={metric.source}
          onChange={(e) => onSave({ source: e.target.value as MetricSource })}
          className={`${selectBase} font-semibold ${SOURCE_STYLE[metric.source]}`}
        >
          {SOURCE_ORDER.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <SaveIndicator state={saveState} />
      </div>
      <div className="flex items-center gap-2 flex-wrap pl-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== metric.sourceNote && onSave({ sourceNote: note })}
          placeholder="데이터 위치 · 산식 메모"
          className="flex-1 min-w-[10rem] px-2 py-1.5 text-xs border border-border rounded-md bg-white text-text-secondary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
        />
        <select value={parentId} onChange={(e) => onSave({ parentGoalId: e.target.value })} className={selectCls} title="연결 KPI">
          {teamGoals.map((g) => <option key={g.id} value={g.id}>↑ {g.team} · {g.name}</option>)}
        </select>
        <select value={metric.ownerEmail} onChange={(e) => onSave({ ownerEmail: e.target.value })} className={selectCls} title="담당자 변경">
          {DIVISIONS.map((div) => (
            <optgroup key={div} label={div}>
              {PEOPLE.filter((p) => p.division === div).map((p) => (
                <option key={p.email} value={p.email}>{p.team} · {p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

function TeamSettingsCard({
  team,
  period,
  goal,
  teamGoals,
  metrics,
  linkedCount,
  saveStates,
  onSaveMetric,
  onSaveGoal,
}: {
  team: string;
  period: Period;
  goal?: GoalSetting;
  teamGoals: GoalSetting[];
  metrics: MetricSetting[];
  linkedCount: number;
  saveStates: Record<string, SaveState>;
  onSaveMetric: (id: string, patch: Partial<MetricSetting>) => void;
  onSaveGoal: (id: string, patch: Partial<GoalSetting>) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const owners = [...new Set(metrics.map((m) => m.ownerEmail))];

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
              <span className="text-[11px] text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                지표 {metrics.length}개
              </span>
              {goal && <span className="text-[11px] text-text-secondary">KPI · {goal.name}</span>}
            </div>
            <div className="mt-1"><SourceTally items={metrics} /></div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
      </div>

      {expanded && (
        <div className="border-t border-border bg-surface/20 px-3 py-3 space-y-2">
          {goal && (
            <GoalCard
              goal={goal}
              period={period}
              linkedCount={linkedCount}
              saveState={saveStates[goal.id]}
              onSave={(patch) => onSaveGoal(goal.id, patch)}
            />
          )}
          {owners.map((email) => {
            const own = metrics.filter((m) => m.ownerEmail === email);
            return (
              <div key={email} className="bg-white rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-surface/40 border-b border-border/60 flex-wrap">
                  <User size={13} className="text-accent" />
                  <span className="text-sm font-semibold text-text-primary">{own[0].ownerName}</span>
                  <span className="text-[11px] text-text-secondary">{own.length}개</span>
                  <div className="ml-auto"><SourceTally items={own} /></div>
                </div>
                {own.map((m) => (
                  <MetricRow
                    key={m.id}
                    metric={m}
                    period={period}
                    teamGoals={teamGoals}
                    saveState={saveStates[m.id]}
                    onSave={(patch) => onSaveMetric(m.id, patch)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function patchJson(url: string, body: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export default function MetricSettings({ division, period }: { division: string; period: Period }) {
  const [metrics, setMetrics] = useState<MetricSetting[] | null>(null);
  const [goals, setGoals] = useState<GoalSetting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  const load = useCallback(async () => {
    setError(null);
    const [mRes, gRes] = await Promise.all([fetch("/api/performance/metrics"), fetch("/api/performance/goals")]);
    if (!mRes.ok || !gRes.ok) {
      const bad = !mRes.ok ? mRes : gRes;
      setError((await bad.json().catch(() => null))?.error ?? "지표를 불러오지 못했습니다.");
      setMetrics([]);
      return;
    }
    setMetrics(await mRes.json());
    setGoals(await gRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setSeeding(true);
    // 비어 있는 컬렉션만 채워진다 (이미 있으면 409)
    const results = await Promise.all([
      fetch("/api/performance/metrics", { method: "POST" }),
      fetch("/api/performance/goals", { method: "POST" }),
    ]);
    if (results.some((r) => !r.ok && r.status !== 409)) setError("초기 등록에 실패했습니다.");
    setSeeding(false);
    load();
  }

  async function saveMetric(id: string, patch: Partial<MetricSetting>) {
    const prev = metrics;
    const owner = patch.ownerEmail ? PEOPLE.find((p) => p.email === patch.ownerEmail) : null;
    const local = owner ? { ...patch, ownerName: owner.name, division: owner.division, team: owner.team } : patch;
    setMetrics((ms) => ms?.map((m) => (m.id === id
      ? { ...m, ...local, targets: patch.targets ? { ...m.targets, ...patch.targets } : m.targets }
      : m)) ?? ms);
    setSaveStates((s) => ({ ...s, [id]: "saving" }));

    if (!(await patchJson("/api/performance/metrics", { id, ...patch }))) {
      setMetrics(prev);
      setSaveStates((s) => ({ ...s, [id]: "error" }));
      return;
    }
    setSaveStates((s) => ({ ...s, [id]: "saved" }));
  }

  async function saveGoal(id: string, patch: Partial<GoalSetting>) {
    const prev = goals;
    setGoals((gs) => gs.map((g) => (g.id === id
      ? { ...g, ...patch, targets: patch.targets ? { ...g.targets, ...patch.targets } : g.targets }
      : g)));
    setSaveStates((s) => ({ ...s, [id]: "saving" }));

    if (!(await patchJson("/api/performance/goals", { id, ...patch }))) {
      setGoals(prev);
      setSaveStates((s) => ({ ...s, [id]: "error" }));
      return;
    }
    setSaveStates((s) => ({ ...s, [id]: "saved" }));
  }

  if (metrics === null) {
    return (
      <div className="flex items-center justify-center py-14 text-sm text-text-secondary gap-2">
        <Loader2 size={14} className="animate-spin" /> 지표 불러오는 중
      </div>
    );
  }

  if (metrics.length === 0 || goals.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-border flex flex-col items-center justify-center py-14 px-6 text-center">
        <Database size={20} className="text-text-secondary/40 mb-2" />
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              {metrics.length === 0 ? "등록된 지표가 없습니다" : "등록된 KPI 목표가 없습니다"}
            </p>
            <p className="text-xs text-text-secondary/60 mt-1 mb-4">
              H2 KPI 재설계 기준 전사·본부·팀 목표와 주간보고록 기반 지표 {PEOPLE.flatMap((p) => p.metrics).length}개를 등록합니다
              <br />이미 등록된 쪽은 건드리지 않습니다
            </p>
            <button
              onClick={seed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {seeding && <Loader2 size={13} className="animate-spin" />}
              초기 등록
            </button>
          </>
        )}
      </div>
    );
  }

  const companyGoals = goals.filter((g) => g.level === "company");
  const divisionGoal = goals.find((g) => g.level === "division" && g.division === division);
  const teamGoals = goals.filter((g) => g.level === "team");
  const divMetrics = metrics.filter((m) => m.division === division);
  const linkedCount = (goalId: string) =>
    metrics.filter((m) => (m.parentGoalId ?? teamGoalId(m.team)) === goalId).length;

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="bg-surface-card rounded-xl border border-border p-4 mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-accent" />
          <span className="text-sm font-bold text-text-primary">전사 KPI</span>
        </div>
        {companyGoals.map((g) => (
          <GoalCard key={g.id} goal={g} period={period} saveState={saveStates[g.id]} onSave={(patch) => saveGoal(g.id, patch)} />
        ))}
      </div>

      {divisionGoal && (
        <div className="bg-surface-card rounded-xl border border-border p-4 mb-5">
          <GoalCard
            goal={divisionGoal}
            period={period}
            saveState={saveStates[divisionGoal.id]}
            onSave={(patch) => saveGoal(divisionGoal.id, patch)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {SOURCE_ORDER.map((s) => (
          <div key={s} className="bg-surface-card rounded-xl border border-border p-4">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SOURCE_STYLE[s]}`}>{SOURCE_LABEL[s]}</span>
            <p className="text-lg font-bold text-text-primary tabular-nums mt-1.5">
              {divMetrics.filter((m) => m.source === s).length}개
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">{SOURCE_DESC[s]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {(TEAM_ORDER[division] ?? []).map((team) => {
          const teamMetrics = divMetrics.filter((m) => m.team === team);
          const goal = teamGoals.find((g) => g.team === team);
          if (teamMetrics.length === 0 && !goal) return null;
          return (
            <TeamSettingsCard
              key={team}
              team={team}
              period={period}
              goal={goal}
              teamGoals={teamGoals}
              metrics={teamMetrics}
              linkedCount={goal ? linkedCount(goal.id) : 0}
              saveStates={saveStates}
              onSaveMetric={saveMetric}
              onSaveGoal={saveGoal}
            />
          );
        })}
      </div>
    </>
  );
}
