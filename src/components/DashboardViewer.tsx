"use client";

import { useState } from "react";
import {
  ExternalLink,
  GitBranch,
  Maximize2,
  Minimize2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Dashboard } from "@/lib/types";
import { getCategories } from "@/lib/dashboards";

export default function DashboardViewer({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const categories = getCategories();
  const cat = categories.find((c) => c.id === dashboard.category);

  return (
    <div
      className={`flex flex-col h-full ${fullscreen ? "fixed inset-0 z-50 bg-white" : ""}`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Link href="/" className="hover:text-accent no-underline text-text-secondary">
            홈
          </Link>
          <ChevronRight size={12} />
          <span>{cat?.label}</span>
          <ChevronRight size={12} />
          <span className="text-text-primary font-medium">
            {dashboard.name}
          </span>
          {dashboard.status === "archive" && (
            <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              아카이브
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {dashboard.github && (
            <a
              href={dashboard.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary hover:text-accent hover:bg-surface rounded-md transition-colors no-underline"
            >
              <GitBranch size={13} />
              GitHub
            </a>
          )}
          <a
            href={dashboard.path}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary hover:text-accent hover:bg-surface rounded-md transition-colors no-underline"
          >
            <ExternalLink size={13} />
            새 탭
          </a>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary hover:text-accent hover:bg-surface rounded-md transition-colors"
          >
            {fullscreen ? (
              <Minimize2 size={13} />
            ) : (
              <Maximize2 size={13} />
            )}
            {fullscreen ? "축소" : "전체화면"}
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-surface">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-accent animate-spin" />
              <span className="text-sm text-text-secondary">로딩 중...</span>
            </div>
          </div>
        )}

        <iframe
          src={dashboard.path}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
