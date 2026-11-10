"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientEnv } from "@/lib/env";
import { emailSchema, otpCodeSchema, safeNext } from "@/lib/validation/auth";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Sends a magic link + 6-digit code. Rate limited per IP and per address. */
export async function sendEmailLink(rawEmail: string, rawNext?: string): Promise<AuthActionResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const email = parsed.data;
  const next = safeNext(rawNext);

  const [byIp, byEmail] = await Promise.all([
    rateLimit(`auth:ip:${await clientIp()}`, "auth"),
    rateLimit(`auth:email:${email}`, "auth"),
  ]);
  if (!byIp.success || !byEmail.success) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    const rateLimited = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      ok: false,
      error: rateLimited
        ? "Too many attempts. Please wait a minute and try again."
        : "We couldn't send the email. Please try again.",
    };
  }
  return { ok: true };
}

export async function verifyEmailCode(rawEmail: string, rawCode: string): Promise<AuthActionResult> {
  const email = emailSchema.safeParse(rawEmail);
  const code = otpCodeSchema.safeParse(rawCode);
  if (!email.success || !code.success) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }
  const limit = await rateLimit(`auth:verify:${await clientIp()}`, "auth");
  if (!limit.success) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error) return { ok: false, error: "That code is wrong or has expired. Request a new one." };
  return { ok: true };
}

export async function signOut(scope: "local" | "global" = "local"): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope });
}
