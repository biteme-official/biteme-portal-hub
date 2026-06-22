"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { getClientAuth, getGoogleProvider } from "@/lib/firebase/client";
import { LayoutDashboard, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(getClientAuth(), getGoogleProvider());
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.pending) {
          setPending(true);
          return;
        }
        throw new Error(data.error || "로그인에 실패했습니다.");
      }

      window.location.href = "/";
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "로그인에 실패했습니다.";

      if (message.includes("popup-closed-by-user")) {
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <Clock size={28} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">
              승인 대기 중
            </h1>
            <p className="text-sm text-text-secondary mt-2 text-center leading-relaxed">
              계정이 등록되었습니다.<br />
              관리자가 승인하면 로그인할 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => setPending(false)}
            className="w-full h-10 border border-border rounded-xl text-sm text-text-secondary hover:bg-surface transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-4">
            <LayoutDashboard size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">
            BiteMe 포털 허브
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            바잇미 전사 업무 포털
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 h-12 bg-navy text-white rounded-xl font-medium text-sm hover:bg-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#fff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#fff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#fff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {loading ? "로그인 중..." : "구글 계정으로 로그인"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <p className="text-xs text-text-secondary text-center mt-6">
          @biteme.co.kr 계정만 이용 가능합니다
        </p>
      </div>
    </div>
  );
}
