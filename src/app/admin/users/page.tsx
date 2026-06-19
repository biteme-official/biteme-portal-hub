"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
  Loader2,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  Pencil,
  LayoutDashboard,
} from "lucide-react";
import { getDashboards } from "@/lib/dashboards";

interface User {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  department: string;
  position: string;
  role: "admin" | "member";
  isActive: boolean;
  dashboardAccess: Record<string, string>;
  createdAt: string | null;
  lastLoginAt: string | null;
}

const DIVISIONS: Record<string, string[]> = {
  "CEO 직속": ["전략기획팀", "MKT팀", "해외팀"],
  "COO 본부": ["경영지원팀", "플랫폼팀", "브랜드팀", "CS팀"],
  "CPO 본부": ["상품기획팀", "패션팀", "디자인팀"],
};

function getDivision(department: string): string {
  for (const [div, teams] of Object.entries(DIVISIONS)) {
    if (teams.includes(department)) return div;
  }
  return "미배정";
}

const ALL_TEAMS = Object.values(DIVISIONS).flat();

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"division" | "team" | "all">(
    "division"
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(uid: string, isActive: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, isActive: !isActive }),
    });
    fetchUsers();
  }

  async function toggleRole(uid: string, role: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid,
        role: role === "admin" ? "member" : "admin",
      }),
    });
    fetchUsers();
  }

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.position.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const grouped = useMemo(() => {
    if (viewMode === "all") return { 전체: filteredUsers };

    const result: Record<string, User[]> = {};

    if (viewMode === "division") {
      for (const div of Object.keys(DIVISIONS)) {
        result[div] = [];
      }
      result["미배정"] = [];

      for (const u of filteredUsers) {
        const div = getDivision(u.department);
        (result[div] ??= []).push(u);
      }
    } else {
      for (const team of ALL_TEAMS) {
        result[team] = [];
      }
      result["미배정"] = [];

      for (const u of filteredUsers) {
        const key = u.department || "미배정";
        (result[key] ??= []).push(u);
      }
    }

    // remove empty groups
    for (const key of Object.keys(result)) {
      if (result[key].length === 0) delete result[key];
    }

    return result;
  }, [filteredUsers, viewMode]);

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">사용자 관리</h1>
          <p className="text-sm text-text-secondary mt-1">
            전체 {users.length}명 · 활성 {activeCount}명
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <UserPlus size={16} />
          사용자 추가
        </button>
      </div>

      {/* Search + View Mode */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 이메일, 부서, 직책 검색"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden">
          {(
            [
              { key: "division", label: "본부별", icon: Building2 },
              { key: "team", label: "팀별", icon: Users },
              { key: "all", label: "전체", icon: null },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`flex items-center gap-1 px-3 h-9 text-xs font-medium transition-colors ${
                viewMode === v.key
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {v.icon && <v.icon size={12} />}
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, groupUsers]) => {
            const isCollapsed = collapsedGroups.has(group);
            const teams =
              viewMode === "division" && group !== "미배정"
                ? DIVISIONS[group]
                : null;

            return (
              <div
                key={group}
                className="bg-white rounded-xl border border-border overflow-hidden"
              >
                {/* Group Header */}
                {viewMode !== "all" && (
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-surface hover:bg-surface/80 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-text-secondary" />
                    ) : (
                      <ChevronDown size={14} className="text-text-secondary" />
                    )}
                    {viewMode === "division" ? (
                      <Building2 size={14} className="text-accent" />
                    ) : (
                      <Users size={14} className="text-accent" />
                    )}
                    <span className="text-sm font-semibold text-text-primary">
                      {group}
                    </span>
                    <span className="text-xs text-text-secondary bg-white px-1.5 py-0.5 rounded-full">
                      {groupUsers.length}명
                    </span>
                    {teams && (
                      <span className="text-xs text-text-secondary ml-1">
                        ({teams.join(", ")})
                      </span>
                    )}
                  </button>
                )}

                {/* User Table */}
                {!isCollapsed && (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface/50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                          사용자
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                          부서/직책
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                          역할
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                          상태
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                          마지막 로그인
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-center text-sm text-text-secondary"
                          >
                            소속 인원이 없습니다
                          </td>
                        </tr>
                      ) : (
                        groupUsers.map((u) => (
                          <tr
                            key={u.uid}
                            className="border-b border-border last:border-0 hover:bg-surface/30"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.name}
                                    className="w-8 h-8 rounded-full"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                                    {u.name[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-text-primary">
                                    {u.name}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {u.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              {u.department || "-"} / {u.position || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                  u.role === "admin"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {u.role === "admin" ? (
                                  <ShieldCheck size={12} />
                                ) : (
                                  <Shield size={12} />
                                )}
                                {u.role === "admin" ? "관리자" : "멤버"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  u.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {u.isActive ? "활성" : "비활성"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-text-secondary">
                              {u.lastLoginAt
                                ? new Date(u.lastLoginAt).toLocaleDateString(
                                    "ko-KR"
                                  )
                                : "미접속"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="p-1.5 rounded-md hover:bg-surface text-text-secondary hover:text-accent transition-colors"
                                  title="정보 수정"
                                >
                                  <Pencil size={14} />
                                </button>
                                {u.uid !== currentUser?.uid && (
                                  <>
                                    <button
                                      onClick={() =>
                                        toggleRole(u.uid, u.role)
                                      }
                                      className="p-1.5 rounded-md hover:bg-surface text-text-secondary hover:text-accent transition-colors"
                                      title={
                                        u.role === "admin"
                                          ? "멤버로 변경"
                                          : "관리자로 변경"
                                      }
                                    >
                                      {u.role === "admin" ? (
                                        <Shield size={14} />
                                      ) : (
                                        <ShieldCheck size={14} />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        toggleActive(u.uid, u.isActive)
                                      }
                                      className="p-1.5 rounded-md hover:bg-surface text-text-secondary hover:text-accent transition-colors"
                                      title={
                                        u.isActive ? "비활성화" : "활성화"
                                      }
                                    >
                                      {u.isActive ? (
                                        <UserX size={14} />
                                      ) : (
                                        <UserCheck size={14} />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <UserFormModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <UserFormModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [position, setPosition] = useState(user?.position || "");
  const [role, setRole] = useState<"member" | "admin">(user?.role || "member");
  const [dashboardAccess, setDashboardAccess] = useState<Record<string, string>>(
    user?.dashboardAccess || {}
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const allDashboards = getDashboards();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (isEdit) {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          name,
          department,
          position,
          role,
          dashboardAccess,
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다.");
      }
    } else {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, department, position, role }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || "등록에 실패했습니다.");
      }
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">
            {isEdit ? "사용자 정보 수정" : "사용자 추가"}
          </h2>
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
              이메일 {!isEdit && "*"}
            </label>
            <input
              type="email"
              required={!isEdit}
              disabled={isEdit}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@biteme.co.kr"
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                소속 팀
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
              >
                <option value="">선택</option>
                {Object.entries(DIVISIONS).map(([div, teams]) => (
                  <optgroup key={div} label={div}>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                직책
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="매니저"
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              역할
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "admin")}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            >
              <option value="member">멤버</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-2">
              <LayoutDashboard size={14} />
              대시보드 접근 권한
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2.5">
              {allDashboards.map((d) => {
                const hasRoles = d.roles && d.roles.length > 0;
                const currentRole = dashboardAccess[d.slug] || "";

                return (
                  <div
                    key={d.slug}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface"
                  >
                    {hasRoles ? (
                      <>
                        <select
                          value={currentRole}
                          onChange={(e) => {
                            setDashboardAccess((prev) => {
                              const next = { ...prev };
                              if (e.target.value) {
                                next[d.slug] = e.target.value;
                              } else {
                                delete next[d.slug];
                              }
                              return next;
                            });
                          }}
                          className="h-7 px-2 rounded border border-border bg-surface text-xs focus:outline-none focus:border-accent min-w-[80px]"
                        >
                          <option value="">접근 불가</option>
                          {d.roles!.map((r) => (
                            <option key={r} value={r}>
                              {d.roleLabels?.[r] || r}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-text-primary flex-1">
                          {d.name}
                        </span>
                        {currentRole && (
                          <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                            {d.roleLabels?.[currentRole] || currentRole}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          checked={!!currentRole}
                          onChange={() => {
                            setDashboardAccess((prev) => {
                              const next = { ...prev };
                              if (next[d.slug]) {
                                delete next[d.slug];
                              } else {
                                next[d.slug] = "viewer";
                              }
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-text-primary flex-1">
                          {d.name}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, string> = {};
                  for (const d of allDashboards) {
                    all[d.slug] = d.roles?.[0] || "viewer";
                  }
                  setDashboardAccess(all);
                }}
                className="text-xs text-accent hover:text-accent/80"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setDashboardAccess({})}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                전체 해제
              </button>
            </div>
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
              ) : isEdit ? (
                "저장"
              ) : (
                "등록"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
