import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Account restricted", robots: { index: false } };

export default async function SuspendedPage() {
  const profile = await getProfile();
  const banned = profile?.status === "banned";
  let until: string | null = null;
  if (profile?.status === "suspended") {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", profile.id).maybeSingle();
    until = ((data as { suspended_until?: string | null } | null)?.suspended_until) ?? null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-bold">{banned ? "Your account has been closed" : "Your account is suspended"}</h1>
      <p className="text-muted">
        {banned ? "You can no longer use GroundWar with this account." : `You can't use your account right now${until ? ` until ${formatDate(until)}` : ""}.`} Public pages are still open to everyone.
      </p>
      <p className="text-sm text-muted">If you think this is a mistake, contact support from the <Link href="/contact" className="font-semibold text-primary underline">Contact page</Link>.</p>
      <div className="flex justify-center gap-3">
        <Link href="/tournaments" className="font-semibold text-primary underline">Browse tournaments</Link>
        <form action="/api/auth/logout" method="post"><button className="font-semibold text-primary underline" type="submit">Log out</button></form>
      </div>
    </main>
  );
}
