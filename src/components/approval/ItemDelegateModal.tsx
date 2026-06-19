"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Search } from "lucide-react";
import type { UserRef } from "@/lib/types/approval";

export default function ItemDelegateModal({
  approvalId,
  onClose,
  onDelegated,
}: {
  approvalId: string;
  onClose: () => void;
  onDelegated: () => void;
}) {
  const [users, setUsers] = useState<UserRef[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRef | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {});
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.includes(query) ||
      u.email.includes(query) ||
      u.department.includes(query)
  );

  async function handleDelegate() {
    if (!selectedUser) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/approvals/${approvalId}/delegate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delegateTo: selectedUser }),
    });

    if (res.ok) {
      onDelegated();
    } else {
      const data = await res.json();
      setError(data.error || "위임에 실패했습니다.");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">건별 결재 위임</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-secondary">
            이 결재건의 승인 권한을 다른 사람에게 위임합니다.
          </p>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="위임 대상자 검색 (이름, 부서)"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {selectedUser && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
              {selectedUser.photoURL ? (
                <img
                  src={selectedUser.photoURL}
                  alt={selectedUser.name}
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">
                  {selectedUser.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {selectedUser.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {selectedUser.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {!selectedUser && (
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              {filtered.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-6">
                  검색 결과가 없습니다
                </p>
              ) : (
                filtered.map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => {
                      setSelectedUser(u);
                      setQuery("");
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-surface flex items-center gap-2.5 border-b border-border last:border-0"
                  >
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.name}
                        className="w-6 h-6 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">
                        {u.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {u.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {u.department || u.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleDelegate}
            disabled={!selectedUser || submitting}
            className="flex-1 h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              "위임하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
