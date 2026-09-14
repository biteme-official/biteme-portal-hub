"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Users, User, Database, Loader2, AlertCircle } from "lucide-react";
import { PEOPLE, TEAM_ORDER, DIVISIONS } from "./org-data";
import {
  SOURCE_ORDER,
  SOURCE_LABEL,
  CADENCE_ORDER,
  CADENCE_LABEL,
  type MetricSetting,
  type MetricSource,
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

function SourceTally({ metrics }: { metrics: MetricSetting[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SOURCE_ORDER.map((s) => {
        const n = metrics.filter((m) => m.source === s).length;
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

function MetricRow({
  metric,
  saveState,
  onSave,
}: {
  metric: MetricSetting;
  saveState?: SaveState;
  onSave: (patch: Partial<MetricSetting>) => void;
}) {
  const [name, setName] = useState(metric.name);
  const [note, setNote] = useState(metric.sourceNote);

  useEffect(() => setName(metric.name), [metric.name]);
  useEffect(() => setNote(metric.sourceNote), [metric.sourceNote]);

  const selectBase = "px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:border-accent";
  const selectCls = `${selectBase} border-border bg-white text-text-primary`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_auto_auto_minmax(0,1.2fr)_auto] gap-2 items-center px-3 py-2 border-t border-border/50 first:border-t-0">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== metric.name && onSave({ name })}
        className="min-w-0 px-2 py-1.5 text-[13px] border border-transparent hover:border-border rounded-md bg-transparent text-text-primary focus:outline-none focus:border-accent focus:bg-white"
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
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== metric.sourceNote && onSave({ sourceNote: note })}
        placeholder="데이터 위치 · 산식 메모"
        className="min-w-0 px-2 py-1.5 text-xs border border-border rounded-md bg-white text-text-secondary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
      />
      <div className="flex items-center gap-2 justify-end">
        <select value={metric.ownerEmail} onChange={(e) => onSave({ ownerEmail: e.target.value })} className={selectCls} title="담당자 변경">
          {DIVISIONS.map((div) => (
            <optgroup key={div} label={div}>
              {PEOPLE.filter((p) => p.division === div).map((p) => (
                <option key={p.email} value={p.email}>{p.team} · {p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="w-10 text-[10px] text-right shrink-0">
          {saveState === "saving" && <Loader2 size={11} className="inline animate-spin text-text-secondary" />}
          {saveState === "saved" && <span className="text-emerald-600">저장됨</span>}
          {saveState === "error" && <span className="text-red-600">실패</span>}
        </span>
      </div>
    </div>
  );
}

function TeamSettingsCard({
  team,
  metrics,
  saveStates,
  onSave,
}: {
  team: string;
  metrics: MetricSetting[];
  saveStates: Record<string, SaveState>;
  onSave: (id: string, patch: Partial<MetricSetting>) => void;
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
            </div>
            <div className="mt-1"><SourceTally metrics={metrics} /></div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
      </div>

      {expanded && (
        <div className="border-t border-border bg-surface/20 px-3 py-3 space-y-2">
          {owners.map((email) => {
            const own = metrics.filter((m) => m.ownerEmail === email);
            return (
              <div key={email} className="bg-white rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-surface/40 border-b border-border/60 flex-wrap">
                  <User size={13} className="text-accent" />
                  <span className="text-sm font-semibold text-text-primary">{own[0].ownerName}</span>
                  <span className="text-[11px] text-text-secondary">{own.length}개</span>
                  <div className="ml-auto"><SourceTally metrics={own} /></div>
                </div>
                {own.map((m) => (
                  <MetricRow key={m.id} metric={m} saveState={saveStates[m.id]} onSave={(patch) => onSave(m.id, patch)} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MetricSettings({ division }: { division: string }) {
  const [metrics, setMetrics] = useState<MetricSetting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/performance/metrics");
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "지표를 불러오지 못했습니다.");
      setMetrics([]);
      return;
    }
    setMetrics(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setSeeding(true);
    const res = await fetch("/api/performance/metrics", { method: "POST" });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "초기 등록에 실패했습니다.");
    setSeeding(false);
    load();
  }

  async function save(id: string, patch: Partial<MetricSetting>) {
    const prev = metrics;
    const owner = patch.ownerEmail ? PEOPLE.find((p) => p.email === patch.ownerEmail) : null;
    const local = owner ? { ...patch, ownerName: owner.name, division: owner.division, team: owner.team } : patch;
    setMetrics((ms) => ms?.map((m) => (m.id === id ? { ...m, ...local } : m)) ?? ms);
    setSaveStates((s) => ({ ...s, [id]: "saving" }));

    const res = await fetch("/api/performance/metrics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      setMetrics(prev);
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

  if (metrics.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-border flex flex-col items-center justify-center py-14 px-6 text-center">
        <Database size={20} className="text-text-secondary/40 mb-2" />
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-sm text-text-secondary">등록된 지표가 없습니다</p>
            <p className="text-xs text-text-secondary/60 mt-1 mb-4">
              주간보고록 기반 지표 {PEOPLE.flatMap((p) => p.metrics).length}개를 1차 출처 분류와 함께 등록합니다
            </p>
            <button
              onClick={seed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {seeding && <Loader2 size={13} className="animate-spin" />}
              초기 지표 등록
            </button>
          </>
        )}
      </div>
    );
  }

  const divMetrics = metrics.filter((m) => m.division === division);

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} /> {error}
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
          if (teamMetrics.length === 0) return null;
          return <TeamSettingsCard key={team} team={team} metrics={teamMetrics} saveStates={saveStates} onSave={save} />;
        })}
      </div>
    </>
  );
}
