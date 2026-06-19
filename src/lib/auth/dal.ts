import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session || session.expiresAt < Date.now()) {
    redirect("/login");
  }
  return session;
});

export async function getCurrentUser() {
  return verifySession();
}
