import "server-only";

/**
 * KMS(kms.biteme.co.kr) 포털 API 호출.
 * 결재·양식·대결·알림은 KMS DB 에 있고, Firebase 는 로그인·users 권한만 쓴다.
 * env: KMS_API_URL (예: https://kms.biteme.co.kr/api/portal), KMS_API_TOKEN
 */
export class KmsError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface KmsOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  actorUid?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function kms<T = unknown>(path: string, opts: KmsOptions = {}): Promise<T> {
  const base = process.env.KMS_API_URL;
  const token = process.env.KMS_API_TOKEN;
  if (!base || !token) {
    throw new KmsError("KMS 환경변수가 설정되지 않았습니다. KMS_API_URL, KMS_API_TOKEN을 확인하세요.", 500);
  }

  const url = new URL(base.replace(/\/$/, "") + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (opts.actorUid) headers["X-Portal-User"] = opts.actorUid;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // KMS 오류 문구(예: "기안자만 수정할 수 있습니다.")를 그대로 화면에 보여준다
    const firstError = data?.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : null;
    throw new KmsError(firstError || data?.message || `KMS 오류 (${res.status})`, res.status);
  }
  return data as T;
}

/** KMS 페이지 목록을 끝까지 모두 가져온다 */
export async function kmsAll<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const res = await kms<{ data: T[]; last_page: number }>(path, { query: { ...query, per_page: 500, page } });
    items.push(...res.data);
    if (page >= res.last_page) return items;
  }
}
