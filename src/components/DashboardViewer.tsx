"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink,
  GitBranch,
  Maximize2,
  Minimize2,
  ChevronRight,
  Loader2,
  ShieldX,
  Cookie,
  X as XIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import type { Dashboard } from "@/lib/types";
import { getCategories } from "@/lib/dashboards";

const isNgrokUrl = (url: string) => url.includes("ngrok");

export default function DashboardViewer({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showCookieGuide, setShowCookieGuide] = useState(() => {
    if (!isNgrokUrl(dashboard.path)) return false;
    try {
      return localStorage.getItem("ngrok-cookie-guide-dismissed") !== "1";
    } catch {
      return true;
    }
  });
  const [guideExpanded, setGuideExpanded] = useState(false);
  const categories = getCategories();
  const cat = categories.find((c) => c.id === dashboard.category);

  useEffect(() => {
    fetch("/api/auth/iframe-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: dashboard.slug }),
    })
      .then((r) => {
        if (r.status === 403) {
          setAccessDenied(true);
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error(`iframe-token ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data?.token) {
          const url = new URL(dashboard.path);
          url.searchParams.set("portal_token", data.token);
          setIframeSrc(url.toString());
        }
      })
      .catch((err) => {
        console.error("iframe-token error:", err);
        setIframeSrc(dashboard.path);
      });
  }, [dashboard.slug, dashboard.path]);

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

      {showCookieGuide && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
          <div className="flex items-start gap-2.5">
            <Cookie size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-900">
                  대시보드가 안 보이나요? 서드파티 쿠키 허용이 필요합니다
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setGuideExpanded(!guideExpanded)}
                    className="text-amber-600 hover:text-amber-800 p-0.5"
                  >
                    {guideExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setShowCookieGuide(false);
                      try { localStorage.setItem("ngrok-cookie-guide-dismissed", "1"); } catch {}
                    }}
                    className="text-amber-400 hover:text-amber-600 p-0.5"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
              {guideExpanded && (
                <div className="mt-2 space-y-2 text-xs text-amber-800">
                  <p className="font-medium">Chrome 설정 방법:</p>
                  <ol className="list-decimal list-inside space-y-1.5 ml-1">
                    <li>주소창 왼쪽의 <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 rounded text-[11px] font-mono">자물쇠</span> 또는 <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 rounded text-[11px] font-mono">설정</span> 아이콘 클릭</li>
                    <li><strong>쿠키 및 사이트 데이터</strong> 선택</li>
                    <li><strong>서드파티 쿠키 허용</strong>으로 변경</li>
                    <li>페이지 새로고침 (F5)</li>
                  </ol>
                  <div className="pt-1.5 border-t border-amber-200">
                    <p className="text-amber-700">또는 <strong>새 탭</strong> 버튼으로 대시보드를 직접 열어 &quot;Visit Site&quot; 클릭 후 돌아오면 됩니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-surface">
        {accessDenied ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldX size={28} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                접근 권한이 없습니다
              </h3>
              <p className="text-sm text-text-secondary max-w-sm">
                이 대시보드에 대한 접근 권한이 설정되지 않았습니다.
                관리자에게 권한을 요청하세요.
              </p>
              <Link
                href="/"
                className="mt-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 no-underline"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="text-accent animate-spin" />
                  <span className="text-sm text-text-secondary">로딩 중...</span>
                </div>
              </div>
            )}

            {iframeSrc && (
              <iframe
                src={iframeSrc}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
