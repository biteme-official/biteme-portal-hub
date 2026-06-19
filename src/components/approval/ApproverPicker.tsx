"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, GripVertical, Users, User } from "lucide-react";
import type { UserRef } from "@/lib/types/approval";

interface PickerUser {
  uid: string;
  name: string;
  email: string;
  department: string;
  photoURL: string | null;
  position: string;
}

export default function ApproverPicker({
  selected,
  onChange,
  excludeUid,
  excludeUids = [],
  label = "결재자",
  placeholder = "결재자 검색 (이름, 이메일, 부서)",
  showOrder = true,
  showTeamPicker = false,
}: {
  selected: UserRef[];
  onChange: (approvers: UserRef[]) => void;
  excludeUid: string;
  excludeUids?: string[];
  label?: string;
  placeholder?: string;
  showOrder?: boolean;
  showTeamPicker?: boolean;
}) {
  const [users, setUsers] = useState<PickerUser[]>([]);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [pickerMode, setPickerMode] = useState<"individual" | "team">("individual");
  const ref = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = users.filter(
    (u) =>
      u.uid !== excludeUid &&
      !excludeUids.includes(u.uid) &&
      !selected.some((s) => s.uid === u.uid) &&
      (u.name.includes(query) ||
        u.email.includes(query) ||
        u.department.includes(query))
  );

  const teams = useMemo(() => {
    const map = new Map<string, PickerUser[]>();
    for (const u of users) {
      if (!u.department || u.uid === excludeUid || excludeUids.includes(u.uid)) continue;
      if (!map.has(u.department)) map.set(u.department, []);
      map.get(u.department)!.push(u);
    }
    return Array.from(map.entries())
      .filter(([name]) => !query || name.includes(query))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [users, excludeUid, excludeUids, query]);

  function addApprover(user: PickerUser) {
    onChange([
      ...selected,
      {
        uid: user.uid,
        name: user.name,
        email: user.email,
        department: user.department,
        photoURL: user.photoURL,
      },
    ]);
    setQuery("");
    setShowDropdown(false);
  }

  function addTeam(teamUsers: PickerUser[]) {
    const newMembers = teamUsers
      .filter((u) => !selected.some((s) => s.uid === u.uid))
      .map((u) => ({
        uid: u.uid,
        name: u.name,
        email: u.email,
        department: u.department,
        photoURL: u.photoURL,
      }));
    if (newMembers.length > 0) {
      onChange([...selected, ...newMembers]);
    }
    setQuery("");
    setShowDropdown(false);
  }

  function removeApprover(uid: string) {
    onChange(selected.filter((s) => s.uid !== uid));
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...selected];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    onChange(updated);
    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label} ({selected.length}명)
      </label>

      {selected.length > 0 && !showOrder && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((approver) => (
            <span
              key={approver.uid}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-border bg-white text-sm group"
            >
              {approver.photoURL ? (
                <img
                  src={approver.photoURL}
                  alt={approver.name}
                  className="w-5 h-5 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[9px] font-bold flex items-center justify-center">
                  {approver.name[0]}
                </span>
              )}
              <span className="text-text-primary">{approver.name}</span>
              <button
                type="button"
                onClick={() => removeApprover(approver.uid)}
                className="text-text-secondary/40 hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length > 0 && showOrder && (
        <div className="space-y-1.5 mb-3">
          {selected.map((approver, i) => (
            <div
              key={approver.uid}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-lg border border-border bg-white group cursor-move ${
                dragIdx === i ? "opacity-50" : ""
              }`}
            >
              <GripVertical
                size={14}
                className="text-text-secondary/40 shrink-0"
              />
              <span className="text-xs font-bold text-accent w-5 text-center shrink-0">
                {i + 1}
              </span>
              {approver.photoURL ? (
                <img
                  src={approver.photoURL}
                  alt={approver.name}
                  className="w-6 h-6 rounded-full shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                  {approver.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-text-primary">
                  {approver.name}
                </span>
                {approver.department && (
                  <span className="text-xs text-text-secondary ml-1">
                    {approver.department}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeApprover(approver.uid)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative" ref={ref}>
        <div className="flex items-center bg-surface rounded-lg border border-border px-3 h-10 gap-2">
          <Search size={14} className="text-text-secondary" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className="bg-transparent flex-1 text-sm outline-none text-text-primary placeholder:text-text-secondary/50"
          />
        </div>

        {showDropdown && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-40">
            {showTeamPicker && (
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setPickerMode("individual")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    pickerMode === "individual"
                      ? "text-accent border-b-2 border-accent"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <User size={12} />
                  개인
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMode("team")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    pickerMode === "team"
                      ? "text-accent border-b-2 border-accent"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Users size={12} />
                  팀
                </button>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto">
              {(!showTeamPicker || pickerMode === "individual") && (
                <>
                  {filtered.length === 0 && users.length > 0 && (
                    <p className="text-xs text-text-secondary text-center py-4">
                      선택 가능한 사용자가 없습니다
                    </p>
                  )}
                  {users.length === 0 && (
                    <p className="text-xs text-text-secondary text-center py-4">
                      등록된 사용자가 없습니다
                    </p>
                  )}
                  {filtered.map((user) => (
                    <button
                      type="button"
                      key={user.uid}
                      onClick={() => addApprover(user)}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface flex items-center gap-3 border-b border-border last:border-0"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.name}
                          className="w-7 h-7 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                          {user.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {user.name}
                          {user.position && (
                            <span className="text-xs text-text-secondary ml-1">
                              {user.position}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {user.department || user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {showTeamPicker && pickerMode === "team" && (
                <>
                  {teams.length === 0 && (
                    <p className="text-xs text-text-secondary text-center py-4">
                      선택 가능한 팀이 없습니다
                    </p>
                  )}
                  {teams.map(([dept, members]) => {
                    const addable = members.filter(
                      (m) => !selected.some((s) => s.uid === m.uid)
                    );
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => addTeam(addable)}
                        disabled={addable.length === 0}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface flex items-center gap-3 border-b border-border last:border-0 disabled:opacity-40"
                      >
                        <div className="w-7 h-7 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center">
                          <Users size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {dept}
                            <span className="text-xs text-text-secondary ml-1">
                              {addable.length}명
                            </span>
                          </p>
                          <p className="text-xs text-text-secondary truncate">
                            {members.map((m) => m.name).join(", ")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
