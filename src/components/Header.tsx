"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, LayoutDashboard, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { searchDashboards } from "@/lib/dashboards";
import type { Dashboard } from "@/lib/types";
import UserMenu from "./UserMenu";
import PendingApprovalBadge from "./PendingApprovalBadge";
import NotificationBell from "./NotificationBell";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";

export default function Header() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Dashboard[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toggle } = useMobileSidebar();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      setResults(searchDashboards(value));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, []);

  function select(d: Dashboard) {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/${d.slug}`);
  }

  return (
    <header className="h-14 bg-navy flex items-center px-3 md:px-5 gap-2 md:gap-4 shrink-0 z-50 relative">
      <button
        onClick={toggle}
        className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
        aria-label="메뉴"
      >
        <Menu size={20} />
      </button>

      <a href="/" className="flex items-center gap-2 text-white no-underline">
        <LayoutDashboard size={22} className="text-accent" />
        <span className="font-bold text-[15px] tracking-tight hidden sm:inline">
          BiteMe 포털 허브
        </span>
        <span className="font-bold text-[15px] tracking-tight sm:hidden">
          BiteMe
        </span>
      </a>

      <div className="flex-1" />

      <div className="relative w-full max-w-sm hidden sm:block">
        <div className="flex items-center bg-white/10 rounded-lg px-3 h-9 gap-2">
          <Search size={15} className="text-white/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query.trim() && setOpen(true)}
            placeholder="검색... (Ctrl+K)"
            className="bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40 flex-1"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="text-white/50 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-50">
            {results.map((d) => (
              <button
                key={d.slug}
                onClick={() => select(d)}
                className="w-full text-left px-4 py-2.5 hover:bg-surface flex flex-col gap-0.5 border-b border-border last:border-0"
              >
                <span className="text-sm font-medium text-text-primary">
                  {d.name}
                </span>
                <span className="text-xs text-text-secondary">
                  {d.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <PendingApprovalBadge />
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
