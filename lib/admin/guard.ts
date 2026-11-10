import "server-only";
import { notFound } from "next/navigation";
import { getProfile, getSessionUser } from "@/lib/session";

/** Admin-only server pages and actions. Everyone else gets a 404 (middleware rewrites too; RLS is the real guard). */
export async function requireAdmin(): Promise<{ userId: string; email: string | null }> {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user || !profile?.is_admin) notFound();
  return { userId: user.id, email: user.email ?? null };
}
