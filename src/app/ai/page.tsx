"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Database,
  RefreshCw,
} from "lucide-react";

const transport = new DefaultChatTransport({ api: "/api/ai/chat" });

interface SourceStatus {
  lastUpdated: string;
  recordCount: number;
}

type StatusMap = Record<string, SourceStatus | null>;

const SOURCE_LABELS: Record<string, string> = {
  product: "프로덕트",
  smartstore: "스마트스토어",
  b2b: "B2B",
};

export default function AiPage() {
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [sourceStatus, setSourceStatus] = useState<StatusMap | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/knowledge/status")
      .then((r) => r.json())
      .then(setSourceStatus)
      .catch(() => {});
  }, []);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(input);
  }

  function refreshKnowledge() {
    fetch("/api/knowledge/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources: ["product"] }),
    })
      .then(() => fetch("/api/knowledge/status"))
      .then((r) => r.json())
      .then(setSourceStatus)
      .catch(() => {});
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    return `${Math.round(diffHr / 24)}일 전`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-light rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">
              AI 어시스턴트
            </h1>
            <p className="text-[11px] text-text-secondary">
              멀티소스 데이터 기반 질의응답
            </p>
          </div>
        </div>
        <button
          onClick={refreshKnowledge}
          className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors px-2 py-1 rounded-md hover:bg-accent-light/30"
          title="데이터 갱신"
        >
          <RefreshCw size={12} />
          갱신
        </button>
      </div>

      {sourceStatus && (
        <div className="flex items-center gap-3 px-5 py-2 bg-surface border-b border-border text-[11px] shrink-0">
          <Database size={12} className="text-text-secondary shrink-0" />
          {Object.entries(SOURCE_LABELS).map(([id, label]) => {
            const s = sourceStatus[id];
            return (
              <span
                key={id}
                className={`flex items-center gap-1 ${s ? "text-text-secondary" : "text-text-secondary/40"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${s ? "bg-green-400" : "bg-gray-300"}`}
                />
                {label}
                {s && (
                  <span className="text-text-secondary/60">
                    {formatTime(s.lastUpdated)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-accent-light rounded-2xl flex items-center justify-center mb-4">
              <Bot size={28} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              무엇이든 물어보세요
            </h2>
            <p className="text-sm text-text-secondary max-w-md mb-6">
              프로덕트, 스마트스토어, B2B 도매 데이터를 기반으로 답변합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {[
                "더블히트 패딩 출시일 확인해줘",
                "프라이싱 미확정 SKU 목록 알려줘",
                "스마트스토어 이번 달 매출 현황은?",
                "B2B 상위 5개 거래처 매출은?",
                "스마트스토어 vs B2B 매출 비교",
                "전체 채널 종합 현황 요약",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="text-left text-xs text-text-secondary bg-white border border-border rounded-lg px-3 py-2.5 hover:border-accent/40 hover:bg-accent-light/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
          >
            {m.role === "assistant" && (
              <div className="w-7 h-7 bg-accent-light rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-accent" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-navy text-white"
                  : "bg-white border border-border text-text-primary"
              }`}
            >
              {m.role === "assistant" ? (
                <div
                  className="prose prose-sm max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:bg-surface [&_p]:my-1"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(
                      m.parts
                        ?.filter(
                          (p): p is { type: "text"; text: string } =>
                            p.type === "text"
                        )
                        .map((p) => p.text)
                        .join("") ?? ""
                    ),
                  }}
                />
              ) : (
                m.parts
                  ?.filter(
                    (p): p is { type: "text"; text: string } =>
                      p.type === "text"
                  )
                  .map((p) => p.text)
                  .join("") ?? ""
              )}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 bg-navy-light rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 bg-accent-light rounded-lg flex items-center justify-center shrink-0">
              <Loader2 size={14} className="text-accent animate-spin" />
            </div>
            <div className="bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-text-secondary">
              답변 생성 중...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
            오류가 발생했습니다: {error.message}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-white p-4">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 max-w-3xl mx-auto"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요..."
            disabled={busy}
            className="flex-1 h-10 px-4 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-30 transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(
    /^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/gm,
    (_, header: string, body: string) => {
      const ths = header
        .split("|")
        .map((h: string) => h.trim())
        .filter(Boolean)
        .map((h: string) => `<th>${h}</th>`)
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) => {
          const tds = row
            .split("|")
            .map((c: string) => c.trim())
            .filter(Boolean)
            .map((c: string) => `<td>${c}</td>`)
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `<table class="border-collapse border border-border w-full my-2"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  html = html.replace(
    /\[(프로덕트 대시보드|스마트스토어|B2B 도매)\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-light text-accent">$1</span>'
  );

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(
    /`(.+?)`/g,
    '<code class="bg-surface px-1 rounded text-xs">$1</code>'
  );
  html = html.replace(/\n/g, "<br/>");

  return html;
}
