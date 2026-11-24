import "server-only";
import { kms, KmsError } from "@/lib/kms/client";

/** 포털 직원 정보 (KMS portal_users). Firebase 는 로그인만 한다. */
export interface PortalUser {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  division: string;
  department: string;
  position: string;
  role: "admin" | "member";
  isActive: boolean;
  isArchived: boolean;
  slackUserId: string | null;
  dashboardAccess: Record<string, string>;
  createdAt: string | null;
  lastLoginAt: string | null;
  authType?: string;
  loginId?: string;
}

export type PortalUserInput = Partial<Omit<PortalUser, "createdAt" | "lastLoginAt">>;

export async function getUser(uid: string): Promise<PortalUser | null> {
  try {
    return await kms<PortalUser>(`/users/${encodeURIComponent(uid)}`);
  } catch (e) {
    if (e instanceof KmsError && e.status === 404) return null;
    throw e;
  }
}

export async function findUserByEmail(email: string): Promise<PortalUser | null> {
  const res = await kms<{ data: PortalUser[] }>("/users", { query: { email, per_page: 1 } });
  return res.data[0] ?? null;
}

export async function listUsers(filter: { active?: boolean; role?: "admin" | "member" } = {}): Promise<PortalUser[]> {
  const res = await kms<{ data: PortalUser[] }>("/users", {
    query: {
      active: filter.active === undefined ? undefined : filter.active ? 1 : 0,
      role: filter.role,
      per_page: 1000,
    },
  });
  return res.data;
}

export async function createUser(data: PortalUserInput & { email: string; name: string }): Promise<PortalUser> {
  return kms<PortalUser>("/users", { method: "POST", body: data });
}

export async function updateUser(uid: string, data: PortalUserInput): Promise<PortalUser> {
  return kms<PortalUser>(`/users/${encodeURIComponent(uid)}`, { method: "PATCH", body: data });
}

export async function deleteUser(uid: string): Promise<void> {
  await kms(`/users/${encodeURIComponent(uid)}`, { method: "DELETE" });
}

export async function touchLogin(uid: string): Promise<void> {
  await kms(`/users/${encodeURIComponent(uid)}/login`, { method: "POST" });
}

/** 관리자가 미리 등록한 직원의 첫 구글 로그인: 기존 정보를 구글 uid 로 옮김 */
export async function moveUser(oldUid: string, newUid: string, photoURL: string | null): Promise<PortalUser> {
  return kms<PortalUser>(`/users/${encodeURIComponent(oldUid)}/move`, {
    method: "POST",
    body: { newUid, photoURL },
  });
}
