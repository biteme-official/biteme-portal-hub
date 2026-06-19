"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Search, GripVertical } from "lucide-react";
import type { UserRef, ApprovalStep } from "@/lib/types/approval";

interface PickerUser {
  uid: string;
  name: string;
  email: string;
  department: string;
  photoURL: string | null;
  position: string;
}

function Stamp({
  label,
  name,
  photoURL,
  status,
  date,
  comment,
  onRemove,
  draggable,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: {
  label: string;
  name: string;
  photoURL?: string | null;
  status?: "waiting" | "current" | "approved" | "rejected" | "requester";
  date?: string | null;
  comment?: string | null;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const borderColor = {
    requester: "border-navy/30 bg-navy/5",
    waiting: "border-gray-200 bg-gray-50",
    current: "border-accent bg-accent/5",
    approved: "border-green-400 bg-green-50",
    rejected: "border-red-400 bg-red-50",
  }[status || "waiting"];

  const stampColor = {
    requester: "text-navy",
    waiting: "text-gray-300",
    current: "text-accent",
    approved: "text-green-500",
    rejected: "text-red-500",
  }[status || "waiting"];

  const stampText = {
    requester: "",
    waiting: "",
    current: "",
    approved: "승인",
    rejected: "반려",
  }[status || "waiting"];

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`relative flex flex-col items-center w-[76px] shrink-0 border-2 rounded-lg overflow-hidden select-none ${borderColor} ${
        isDragging ? "opacity-40" : ""
      } ${draggable ? "cursor-move" : ""} group`}
    >
      {draggable && (
        <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
          <GripVertical size={10} className="text-text-secondary" />
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-red-500 z-10"
        >
          <X size={12} />
        </button>
      )}

      <div className="text-[10px] font-medium text-text-secondary bg-white/60 w-full text-center py-0.5 border-b border-inherit truncate px-1">
        {label}
      </div>

      <div className="flex flex-col items-center justify-center py-2 px-1 min-h-[56px] relative">
        {photoURL ? (
          <img
            src={photoURL}
            alt={name}
            className="w-7 h-7 rounded-full mb-1"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white border border-gray-200 text-[10px] font-bold flex items-center justify-center mb-1 text-text-primary">
            {name[0]}
          </div>
        )}
        <span className="text-[11px] font-medium text-text-primary truncate max-w-full">
          {name}
        </span>

        {stampText && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none`}
          >
            <div
              className={`text-lg font-black ${stampColor} opacity-25 rotate-[-15deg] border-2 border-current rounded-full w-10 h-10 flex items-center justify-center`}
            >
              {stampText}
            </div>
          </div>
        )}
      </div>

      <div className="text-[9px] text-text-secondary bg-white/60 w-full text-center py-0.5 border-t border-inherit h-[18px] truncate px-1">
        {date
          ? new Date(date).toLocaleDateString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
            })
          : status === "current"
            ? "결재중"
            : " "}
      </div>
    </div>
  );
}

export function StampLineEditor({
  requester,
  approvers,
  onChange,
}: {
  requester: { name: string; photoURL?: string | null; position?: string };
  approvers: UserRef[];
  onChange: (approvers: UserRef[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [users, setUsers] = useState<PickerUser[]>([]);
  const [query, setQuery] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const excludeUids = [
    requester.name,
    ...approvers.map((a) => a.uid),
  ];

  const filtered = users.filter(
    (u) =>
      !approvers.some((a) => a.uid === u.uid) &&
      (u.name.includes(query) ||
        u.email.includes(query) ||
        u.department.includes(query))
  );

  function addApprover(user: PickerUser) {
    onChange([
      ...approvers,
      {
        uid: user.uid,
        name: user.name,
        email: user.email,
        department: user.department,
        photoURL: user.photoURL,
      },
    ]);
    setQuery("");
    setShowPicker(false);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...approvers];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    onChange(updated);
    setDragIdx(idx);
  }

  return (
    <div ref={pickerRef}>
      <label className="block text-sm font-medium text-text-primary mb-2">
        결재 라인
      </label>
      <div className="flex items-stretch gap-1.5">
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2">
          <Stamp
            label={requester.position || "기안"}
            name={requester.name}
            photoURL={requester.photoURL}
            status="requester"
          />

          {approvers.map((a, i) => (
            <Stamp
              key={a.uid}
              label={a.department || `${i + 1}차 결재`}
              name={a.name}
              photoURL={a.photoURL}
              status="waiting"
              onRemove={() => onChange(approvers.filter((_, j) => j !== i))}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              isDragging={dragIdx === i}
            />
          ))}
        </div>

        <div className="relative shrink-0 pb-2">
          <button
            type="button"
            onClick={() => {
              setShowPicker(!showPicker);
              setQuery("");
            }}
            className="flex flex-col items-center justify-center w-[76px] h-full border-2 border-dashed border-gray-300 rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <Plus size={20} className="text-gray-400" />
            <span className="text-[10px] text-text-secondary mt-1">추가</span>
          </button>

          {showPicker && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-border overflow-hidden z-50 w-64">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Search size={14} className="text-text-secondary shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 부서 검색"
              className="bg-transparent flex-1 text-sm outline-none text-text-primary placeholder:text-text-secondary/50"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              <X size={14} />
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-4">
                선택 가능한 사용자가 없습니다
              </p>
            ) : (
              filtered.map((user) => (
                <button
                  type="button"
                  key={user.uid}
                  onClick={() => addApprover(user)}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface flex items-center gap-2.5 border-b border-border last:border-0"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      className="w-6 h-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">
                      {user.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.name}
                      {user.position && (
                        <span className="text-xs text-text-secondary ml-1">
                          {user.position}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {user.department || user.email}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StampLineDisplay({
  requester,
  steps,
  submittedAt,
}: {
  requester: { name: string; photoURL?: string | null; department?: string };
  steps: ApprovalStep[];
  submittedAt?: string | null;
}) {
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
      <Stamp
        label={requester.department || "기안"}
        name={requester.name}
        photoURL={requester.photoURL}
        status="requester"
        date={submittedAt}
      />

      {steps.map((step) => (
        <Stamp
          key={step.stepOrder}
          label={step.approver.department || `${step.stepOrder}차 결재`}
          name={step.approver.name}
          photoURL={step.approver.photoURL}
          status={step.status}
          date={step.decidedAt}
          comment={step.comment}
        />
      ))}
    </div>
  );
}
