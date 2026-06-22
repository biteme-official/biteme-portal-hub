"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Plus, Loader2, Inbox, Search, CheckSquare, Trash2, Info, X as XIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ApprovalCard from "@/components/approval/ApprovalCard";
import DelegationSetting from "@/components/approval/DelegationSetting";
import type { ApprovalRequest, ApprovalStatus } from "@/lib/types/approval";
import { STATUS_LABELS } from "@/lib/types/approval";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "my-requests" | "my-approvals" | "cc" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "my-requests", label: "내가 요청한 결재" },
  { key: "my-approvals", label: "내가 결재할 문서" },
  { key: "cc", label: "참조" },
];

const STATUS_FILTERS: { key: ApprovalStatus | ""; label: string }[] = [
  { key: "", label: "전체 상태" },
  { key: "pending", label: "대기중" },
  { key: "in_progress", label: "진행중" },
  { key: "approved", label: "승인완료" },
  { key: "rejected", label: "반려" },
  { key: "draft", label: "임시저장" },
  { key: "canceled", label: "취소됨" },
];

export default function ApprovalListPage() {
  return (
    <Suspense>
      <ApprovalListContent />
    </Suspense>
  );
}

function ApprovalListContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "all";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "">("");
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    try { return sessionStorage.getItem("approval-guide-dismissed") !== "1"; } catch { return true; }
  });
  const isAdmin = user?.role === "admin";

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", tab);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/approvals?${params}`);
    if (res.ok) setApprovals(await res.json());
    setLoading(false);
  }, [tab, statusFilter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const STATUS_ORDER: Record<string, number> = {
    in_progress: 0,
    pending: 1,
    draft: 2,
    approved: 3,
    rejected: 4,
    canceled: 5,
  };

  const filtered = (
    tab === "my-approvals" && user
      ? approvals.filter((a) => {
          const isMyTurn = a.approvalLine.some(
            (s) => s.approver.uid === user.uid && s.status === "current"
          );
          const isInMyLine = a.approvalLine.some(
            (s) => s.approver.uid === user.uid
          );
          return statusFilter ? isInMyLine : isMyTurn || isInMyLine;
        })
      : approvals
  )
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.requester.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.approvalLine.some((s) => s.approver.name.toLowerCase().includes(q)) ||
        a.ccList.some(
          (cc) =>
            cc.name.toLowerCase().includes(q) ||
            cc.department.toLowerCase().includes(q)
        )
      );
    })
    .sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 9;
      const sb = STATUS_ORDER[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const myPendingItems = user
    ? filtered.filter((a) =>
        a.approvalLine.some(
          (s) => s.approver.uid === user.uid && s.status === "current"
        )
      )
    : [];

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === myPendingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(myPendingItems.map((a) => a.id)));
    }
  }

  async function handleBatchApprove() {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}건을 일괄 승인하시겠습니까?`)) return;
    setBatchLoading(true);
    const res = await fetch("/api/approvals/batch-decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: "approve" }),
    });
    if (res.ok) {
      const data = await res.json();
      alert(`${data.succeeded}건 승인 완료${data.failed > 0 ? `, ${data.failed}건 실패` : ""}`);
      setSelectedIds(new Set());
      fetchApprovals();
    }
    setBatchLoading(false);
  }

  const pendingCount = user
    ? approvals.filter((a) =>
        a.approvalLine.some(
          (s) => s.approver.uid === user.uid && s.status === "current"
        )
      ).length
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">전자결재</h1>
          <p className="text-sm text-text-secondary mt-1">
            업무 결재 요청 및 승인 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && approvals.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm(`전체 ${approvals.length}건의 결재 문서를 삭제하시겠습니까?`)) return;
                setDeleteLoading(true);
                const res = await fetch("/api/approvals", { method: "DELETE" });
                if (res.ok) {
                  const data = await res.json();
                  alert(`${data.deleted}건 삭제 완료`);
                  fetchApprovals();
                }
                setDeleteLoading(false);
              }}
              disabled={deleteLoading}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              전체 삭제
            </button>
          )}
          <DelegationSetting />
          <Link
            href="/approval/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors no-underline"
          >
            <Plus size={16} />
            새 결재 요청
          </Link>
        </div>
      </div>

      {showGuide && (
        <div className="flex items-start gap-3 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900 mb-1">포털 전자결재 안내</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              실제 비용 결재는 위하고에서 처리합니다. 포털 전자결재는 커뮤니케이션 소실 방지 및 의사결정 구조 확립을 위한 사전 합의 도구입니다.
              결재 요청 시 승인라인을 지정하고, 결재자는 승인/반려할 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => {
              setShowGuide(false);
              try { sessionStorage.setItem("approval-guide-dismissed", "1"); } catch {}
            }}
            className="text-blue-400 hover:text-blue-600 shrink-0"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목, 기안자, 결재자, 참조자 검색"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
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
            {t.key === "my-approvals" && pendingCount > 0 && (
              <span className="ml-1.5 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ApprovalStatus | "")
          }
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {tab === "my-approvals" && myPendingItems.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80"
          >
            <CheckSquare size={14} />
            {selectedIds.size === myPendingItems.length ? "전체 해제" : "전체 선택"}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-text-secondary">
                {selectedIds.size}건 선택
              </span>
              <button
                onClick={handleBatchApprove}
                disabled={batchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {batchLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                일괄 승인
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-text-secondary/30 mb-3" />
          <p className="text-sm text-text-secondary">결재 문서가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(
            filtered.reduce<Record<string, ApprovalRequest[]>>((acc, a) => {
              (acc[a.status] ??= []).push(a);
              return acc;
            }, {})
          ).map(([status, items]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === "in_progress"
                      ? "bg-blue-500"
                      : status === "pending"
                        ? "bg-yellow-500"
                        : status === "draft"
                          ? "bg-gray-400"
                          : status === "approved"
                            ? "bg-green-500"
                            : status === "rejected"
                              ? "bg-red-500"
                              : "bg-gray-300"
                  }`}
                />
                <h2 className="text-sm font-semibold text-text-primary">
                  {STATUS_LABELS[status as ApprovalStatus]}
                </h2>
                <span className="text-xs text-text-secondary bg-surface px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {items.map((a) => {
                  const isMyTurn =
                    tab === "my-approvals" &&
                    user &&
                    a.approvalLine.some(
                      (s) =>
                        s.approver.uid === user.uid && s.status === "current"
                    );
                  return (
                    <ApprovalCard
                      key={a.id}
                      approval={a}
                      selectable={!!isMyTurn}
                      selected={selectedIds.has(a.id)}
                      onToggle={() => toggleSelect(a.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
