"use client";

import { useState, useEffect, useCallback } from "react";
import { UserRoundCog, X, Loader2, AlertTriangle } from "lucide-react";
import type { UserRef } from "@/lib/types/approval";

interface Delegation {
  ownerUid: string;
  ownerName: string;
  delegateTo: UserRef;
  startDate: string;
  endDate: string | null;
  reason: string;
  isActive: boolean;
}

export default function DelegationSetting() {
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDelegation = useCallback(async () => {
    const res = await fetch("/api/approvals/delegation");
    if (res.ok) {
      const data = await res.json();
      setDelegation(data.delegation);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDelegation();
  }, [fetchDelegation]);

  async function handleRevoke() {
    await fetch("/api/approvals/delegation", { method: "DELETE" });
    setDelegation(null);
  }

  if (loading) return null;

  return (
    <>
      {delegation ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-800 flex-1">
            <span className="font-medium">{delegation.delegateTo.name}</span>
            님에게 결재 위임 중
            {delegation.endDate && ` (~${delegation.endDate})`}
          </p>
          <button
            onClick={handleRevoke}
            className="text-xs text-yellow-700 hover:text-yellow-900 font-medium"
          >
            해제
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
        >
          <UserRoundCog size={12} />
          결재 위임
        </button>
      )}

      {showModal && (
        <DelegationModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchDelegation();
          }}
        />
      )}
    </>
  );
}

function DelegationModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [users, setUsers] = useState<UserRef[]>([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const delegateTo = users.find((u) => u.uid === selectedUid);
    if (!delegateTo) {
      setError("대리 결재자를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/approvals/delegation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delegateTo,
        startDate,
        endDate: endDate || null,
        reason,
      }),
    });

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error || "설정에 실패했습니다.");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">결재 위임 설정</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              대리 결재자 *
            </label>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            >
              <option value="">선택</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.name} ({u.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              사유
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 휴가, 출장"
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin mx-auto" />
              ) : (
                "위임 설정"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
