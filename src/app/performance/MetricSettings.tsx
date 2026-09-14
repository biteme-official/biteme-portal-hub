"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, User, Database, Loader2, AlertCircle, Target, Building2, ChevronDown } from "lucide-react";
import { PEOPLE, TEAM_ORDER, DIVISIONS, type MetricUnit } from "./org-data";
import {
  SOURCE_ORDER,
  SOURCE_LABEL,
  CADENCE_ORDER,
  CADENCE_LABEL,
  GOAL_LEVEL_LABEL,
  PERIODS,
  PERIOD_LABEL,
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

type Tab = "top" | "team" | "person";
const TABS: { key: Tab; label: string }[] = [
  { key: "top", label: "전사 · 본부 목표" },
  { key: "team", label: "팀 KPI" },
  { key: "person", label: "개인 지표" },
];

type SaveState = "saving" | "saved" | "error";

const selectBase = "px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:border-accent";
const selectCls = `${selectBase} border-border bg-white text-text-primary`;
const pillCls = (on: boolean) =>
  `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${on ? "bg-white text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"}`;

/** 금액 입력 단위 — 전사·본부·팀 목표는 억, 개인 지표는 만원 */
type Scale = "eok" | "man";
const SCALE: Record<Scale, { factor: number; suffix: string }> = {
  eok: { factor: 100000000, suffix: "억" },
  man: { factor: 10000, suffix: "만원" },
};

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

function SourceSelect({ value, onChange }: { value: MetricSource; onChange: (s: MetricSource) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as MetricSource)} className={`${selectBase} font-semibold ${SOURCE_STYLE[value]}`}>
      {SOURCE_ORDER.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
    </select>
  );
}

/** 숫자 입력 — 금액은 억/만원 단위로 입력받아 원으로 저장. 비우면 null(미정) */
function NumberField({
  label,
  value,
  unit,
  scale,
  onSave,
}: {
  label?: string;
  value: number | null | undefined;
  unit: MetricUnit;
  scale: Scale;
  onSave: (v: number | null) => void;
}) {
  const factor = unit === "currency" ? SCALE[scale].factor : 1;
  const suffix = unit === "currency" ? SCALE[scale].suffix : unit === "percent" ? "%" : "건";
  const toText = (v: number | null | undefined) =>
    v === null || v === undefined ? "" : String(Math.round((v / factor) * 100) / 100);

  const [text, setText] = useState(toText(value));
  useEffect(() => setText(toText(value)), [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function commit() {
    const n = text.trim() === "" ? null : Number(text);
    if (n !== null && Number.isNaN(n)) return;
    const next = n === null ? null : Math.round(n * factor);
    if (next === (value ?? null)) return;
    onSave(next);
  }

  return (
    <label className="flex items-center gap-1.5">
      {label && <span className="text-[11px] text-text-secondary whitespace-nowrap">{label}</span>}
      <span className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          placeholder="미정"
          className="w-24 pl-2 pr-9 py-1.5 text-xs text-right tabular-nums border border-border rounded-md bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary pointer-events-none">{suffix}</span>
      </span>
    </label>
  );
}

function formatEok(v: number | null | undefined, unit: MetricUnit): string {
  if (v === null || v === undefined) return "미정";
  if (unit === "currency") return `${Math.round((v / 100000000) * 10) / 10}억`;
  return unit === "percent" ? `${v}%` : `${v.toLocaleString()}건`;
}

/** 이름 + 비고 인라인 편집 공통 */
function useInlineText(initial: string) {
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);
  return [text, setText] as const;
}

// ─── 전사 · 본부 목표 (연간 + 분기 말 누적) ─────────────────

/** 분기 말 누적 마일스톤 = 상반기 실적 + 해당 분기까지의 분기 목표 합. 실적도 이 누적값과 비교한다 */
function computeMilestones(goal: GoalSetting): Record<Period, number | null> {
  const out: Record<Period, number | null> = { "2026Q3": null, "2026Q4": null };
  let running: number | null = goal.h1Actual ?? null;
  for (const p of PERIODS) {
    const q = goal.targets?.[p];
    running = running != null && q != null ? running + q : null;
    out[p] = running;
  }
  return out;
}

function AnnualGoalCard({
  goal,
  saveState,
  onSave,
}: {
  goal: GoalSetting;
  saveState?: SaveState;
  onSave: (patch: Partial<GoalSetting>) => void;
}) {
  const [name, setName] = useInlineText(goal.name);
  const [note, setNote] = useInlineText(goal.note);

  const h1 = goal.h1Actual;
  const milestones = computeMilestones(goal);
  const total = milestones["2026Q4"];
  const diff = total != null && goal.annualTarget != null ? total - goal.annualTarget : null;
  const blockCls = "rounded-lg border border-border bg-surface/30 px-3 py-2.5 space-y-2";

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded shrink-0">
          <Target size={9} /> {goal.level === "company" ? "전사" : goal.division}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== goal.name && onSave({ name })}
          className="flex-1 min-w-[10rem] px-2 py-1 text-sm font-semibold border border-transparent hover:border-border rounded-md bg-transparent text-text-primary focus:outline-none focus:border-accent focus:bg-white"
        />
        <SourceSelect value={goal.source} onChange={(source) => onSave({ source })} />
        <SaveIndicator state={saveState} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2.5">
        <div className={blockCls}>
          <NumberField label="상반기 실적" value={h1} unit={goal.unit} scale="eok" onSave={(v) => onSave({ h1Actual: v })} />
          <p className="text-[11px] text-text-secondary">누적 시작점</p>
        </div>

        {PERIODS.map((p) => {
          const q = p.slice(-2);
          return (
            <div key={p} className={blockCls}>
              <NumberField
                label={`${q} 목표`}
                value={goal.targets?.[p]}
                unit={goal.unit}
                scale="eok"
                onSave={(v) => onSave({ targets: { [p]: v } })}
              />
              <div>
                <p className="text-[11px] text-text-secondary">{q} 말 마일스톤</p>
                <p className="text-xl font-bold text-accent tabular-nums leading-tight">{formatEok(milestones[p], goal.unit)}</p>
                <p className="text-[10px] text-text-secondary/70 mt-0.5">누적 실적 비교 · 실적 연동 전</p>
              </div>
            </div>
          );
        })}

        <div className={blockCls}>
          <NumberField label="연간 목표" value={goal.annualTarget} unit={goal.unit} scale="eok" onSave={(v) => onSave({ annualTarget: v })} />
          {diff !== null && Math.abs(diff) >= 10000000 ? (
            <p className={`text-[11px] ${diff < 0 ? "text-red-600" : "text-amber-600"}`}>
              4Q 말 마일스톤이 연간 목표 대비 {diff > 0 ? "+" : ""}{formatEok(diff, goal.unit)}
            </p>
          ) : (
            <p className="text-[11px] text-text-secondary">{total != null ? "4Q 말 마일스톤과 일치" : "분기 목표 입력 후 비교"}</p>
          )}
        </div>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== goal.note && onSave({ note })}
        placeholder="근거 · 확정 필요 사항"
        className="w-full mt-2.5 px-2 py-1.5 text-xs border border-border rounded-md bg-white text-text-secondary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
      />
    </div>
  );
}

// ─── 팀 KPI (분기 단독) ─────────────────────────────────────

function TeamGoalCard({
  goal,
  period,
  linkedCount,
  saveState,
  onSave,
}: {
  goal: GoalSetting;
  period: Period;
  linkedCount: number;
  saveState?: SaveState;
  onSave: (patch: Partial<GoalSetting>) => void;
}) {
  const [name, setName] = useInlineText(goal.name);
  const [note, setNote] = useInlineText(goal.note);

  return (
    <div className="bg-surface-card rounded-xl border border-border px-4 py-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Users size={14} className="text-accent shrink-0" />
        <span className="text-sm font-bold text-text-primary shrink-0">{goal.team}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== goal.name && onSave({ name })}
          className="flex-1 min-w-[10rem] px-2 py-1 text-sm border border-transparent hover:border-border rounded-md bg-transparent text-text-primary focus:outline-none focus:border-accent focus:bg-white"
        />
        <span className="text-[11px] text-text-secondary">연결 지표 {linkedCount}개</span>
        <SaveIndicator state={saveState} />
      </div>
      <div className="flex items-center gap-x-4 gap-y-2 mt-2.5 flex-wrap">
        <NumberField
          label={`${PERIOD_LABEL[period]} 목표`}
          value={goal.targets?.[period]}
          unit={goal.unit}
          scale="eok"
          onSave={(v) => onSave({ targets: { [period]: v } })}
        />
        <SourceSelect value={goal.source} onChange={(source) => onSave({ source })} />
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

// ─── 개인 지표 ──────────────────────────────────────────────

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
  const [name, setName] = useInlineText(metric.name);
  const [note, setNote] = useInlineText(metric.sourceNote);
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
        <NumberField
          value={metric.targets?.[period]}
          unit={metric.unit}
          scale="man"
          onSave={(v) => onSave({ targets: { [period]: v } })}
        />
        <select value={metric.cadence} onChange={(e) => onSave({ cadence: e.target.value as MetricSetting["cadence"] })} className={selectCls}>
          {CADENCE_ORDER.map((c) => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}
        </select>
        <SourceSelect value={metric.source} onChange={(source) => onSave({ source })} />
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

// ─── Main ───────────────────────────────────────────────────

async function patchJson(url: string, body: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

function mergeGoal(g: GoalSetting, patch: Partial<GoalSetting>): GoalSetting {
  return { ...g, ...patch, targets: patch.targets ? { ...g.targets, ...patch.targets } : g.targets };
}

export default function MetricSettings() {
  const [tab, setTab] = useState<Tab>("top");
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [team, setTeam] = useState<string>(TEAM_ORDER[DIVISIONS[0]]?.[0] ?? "");
  const [period, setPeriod] = useState<Period>("2026Q3");

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

  function changeDivision(d: string) {
    setDivision(d);
    setTeam(TEAM_ORDER[d]?.[0] ?? "");
  }

  /** 없는 것만 등록 — 지표는 비어 있을 때만, 목표는 없는 문서·빈 필드만 채움 */
  async function seed() {
    setSeeding(true);
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
    setGoals((gs) => gs.map((g) => (g.id === id ? mergeGoal(g, patch) : g)));
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
            <p className="text-sm text-text-secondary">등록된 지표 · 목표가 없습니다</p>
            <p className="text-xs text-text-secondary/60 mt-1 mb-4">
              H2 KPI 재설계 기준 전사·본부·팀 목표와 주간보고록 기반 지표 {PEOPLE.flatMap((p) => p.metrics).length}개를 등록합니다
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
  const divisionGoals = goals.filter((g) => g.level === "division");
  const teamGoals = goals.filter((g) => g.level === "team");
  const divisionGoal = divisionGoals.find((g) => g.division === division);
  const needsAnnualFill = [...companyGoals, ...divisionGoals].some((g) => !("annualTarget" in g));
  const linkedCount = (goalId: string) =>
    metrics.filter((m) => (m.parentGoalId ?? teamGoalId(m.team)) === goalId).length;

  const divTeams = TEAM_ORDER[division] ?? [];
  const teamMetrics = metrics.filter((m) => m.team === team);
  const owners = [...new Set(teamMetrics.map((m) => m.ownerEmail))];

  return (
    <>
      {/* 단계 탭 */}
      <div className="flex items-center gap-1 mb-4 border-b border-border overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* 본부 · 팀 · 분기 필터 */}
      {tab !== "top" && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            {DIVISIONS.map((d) => (
              <button key={d} onClick={() => changeDivision(d)} className={pillCls(division === d)}>{d}</button>
            ))}
          </div>
          {tab === "person" && (
            <div className="relative">
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-xs font-medium border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
              >
                {divTeams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          )}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 ml-auto">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={pillCls(period === p)}>{PERIOD_LABEL[p]}</button>
            ))}
          </div>
        </div>
      )}

      {tab === "top" && (
        <div className="space-y-5">
          <p className="text-xs text-text-secondary">
            전사·본부는 연간 목표 기준입니다. 분기 목표는 <b>그 분기 금액</b>으로 넣으면 <b>분기 말 마일스톤</b>(상반기 실적 + 분기 목표 누적)이 자동 계산되고, 실적은 이 누적값과 비교합니다. 금액 단위: 억
          </p>
          {needsAnnualFill && (
            <div className="flex items-center justify-between gap-3 p-3 bg-accent/5 border border-accent/30 rounded-lg flex-wrap">
              <span className="text-xs text-text-primary">
                연간 목표 · 상반기 실적 칸이 아직 없습니다. 전사 마일스톤 기준값(매출 200억 · 상반기 87.8억 / 영업이익 20억 · 상반기 11.7억)을 <b>비어 있는 칸에만</b> 채웁니다.
              </span>
              <button
                onClick={seed}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                {seeding && <Loader2 size={12} className="animate-spin" />}
                기준값 채우기
              </button>
            </div>
          )}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-accent" />
              <h3 className="text-sm font-bold text-text-primary">{GOAL_LEVEL_LABEL.company} 목표</h3>
            </div>
            {companyGoals.map((g) => (
              <AnnualGoalCard key={g.id} goal={g} saveState={saveStates[g.id]} onSave={(p) => saveGoal(g.id, p)} />
            ))}
          </section>
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-accent" />
              <h3 className="text-sm font-bold text-text-primary">{GOAL_LEVEL_LABEL.division} 목표</h3>
            </div>
            {divisionGoals.map((g) => (
              <AnnualGoalCard key={g.id} goal={g} saveState={saveStates[g.id]} onSave={(p) => saveGoal(g.id, p)} />
            ))}
          </section>
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-3">
          {divisionGoal && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface border border-border text-xs text-text-secondary flex-wrap">
              <span className="font-semibold text-text-primary">{division} · {divisionGoal.name}</span>
              <span>{PERIOD_LABEL[period]} 목표 {formatEok(divisionGoal.targets?.[period], divisionGoal.unit)}</span>
              <span>{period.slice(-2)} 말 마일스톤 <b className="text-accent">{formatEok(computeMilestones(divisionGoal)[period], divisionGoal.unit)}</b></span>
              <span>연간 {formatEok(divisionGoal.annualTarget, divisionGoal.unit)}</span>
              <button onClick={() => setTab("top")} className="ml-auto text-accent hover:underline">본부 목표 수정</button>
            </div>
          )}
          {divTeams.map((t) => {
            const g = teamGoals.find((x) => x.team === t);
            if (!g) return null;
            return (
              <TeamGoalCard
                key={g.id}
                goal={g}
                period={period}
                linkedCount={linkedCount(g.id)}
                saveState={saveStates[g.id]}
                onSave={(p) => saveGoal(g.id, p)}
              />
            );
          })}
        </div>
      )}

      {tab === "person" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SOURCE_ORDER.map((s) => (
              <div key={s} className="bg-surface-card rounded-xl border border-border p-3.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SOURCE_STYLE[s]}`}>{SOURCE_LABEL[s]}</span>
                <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                  {teamMetrics.filter((m) => m.source === s).length}개
                </p>
                <p className="text-[11px] text-text-secondary leading-snug">{SOURCE_DESC[s]}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-text-secondary">
            {PERIOD_LABEL[period]} 목표 입력 · 금액 단위: 만원 · 연결 KPI 기본값은 담당 팀 KPI
          </p>

          {owners.length === 0 && (
            <div className="bg-surface-card rounded-xl border border-border py-10 text-center text-sm text-text-secondary">
              {team}에 등록된 지표가 없습니다
            </div>
          )}

          {owners.map((email) => {
            const own = teamMetrics.filter((m) => m.ownerEmail === email);
            return (
              <div key={email} className="bg-surface-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-surface/40 border-b border-border/60 flex-wrap">
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
                    onSave={(p) => saveMetric(m.id, p)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
