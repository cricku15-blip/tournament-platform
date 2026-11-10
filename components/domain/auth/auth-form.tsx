"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { createClient } from "@/lib/supabase/browser";
import { emailSchema } from "@/lib/validation/auth";
import { sendEmailLink } from "@/app/(auth)/actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [pending, setPending] = React.useState(false);
  const [googlePending, setGooglePending] = React.useState(false);
  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    const res = await sendEmailLink(parsed.data, next);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(
      `/auth/check-email?email=${encodeURIComponent(parsed.data)}&next=${encodeURIComponent(next)}`
    );
  }

  async function onGoogle() {
    setError(undefined);
    setGooglePending(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) {
      setGooglePending(false);
      setError("Google sign-in isn't available right now. Use your email instead.");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isLogin ? "Log in to manage your games." : "Join local tournaments in your city."}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Button type="button" variant="secondary" size="lg" onClick={onGoogle} loading={googlePending}>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted" role="separator">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField id="email" label="Email address" error={error}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              error={Boolean(error)}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <Button type="submit" size="lg" loading={pending}>
            Email me a sign-in link
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link
          href={`${isLogin ? "/signup" : "/login"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-primary hover:underline"
        >
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
      {!isLogin && (
        <p className="mt-3 text-center text-xs text-muted">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      )}
    </div>
  );
}
