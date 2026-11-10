"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeInput } from "./code-input";
import { sendEmailLink, verifyEmailCode } from "@/app/(auth)/actions";

const RESEND_SECONDS = 60;

export function CheckEmail({ email, next, expired }: { email: string; next: string; expired: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(
    expired ? "That link has expired or was already used." : undefined
  );
  const [info, setInfo] = React.useState<string | undefined>();
  const [verifying, setVerifying] = React.useState(false);
  const [seconds, setSeconds] = React.useState(expired ? 0 : RESEND_SECONDS);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function onComplete(code: string) {
    setError(undefined);
    setVerifying(true);
    const res = await verifyEmailCode(email, code);
    if (!res.ok) {
      setVerifying(false);
      setError(res.error);
      return;
    }
    // Middleware routes new users to /onboarding.
    router.replace(next);
    router.refresh();
  }

  async function onResend() {
    setError(undefined);
    setInfo(undefined);
    setResending(true);
    const res = await sendEmailLink(email, next);
    setResending(false);
    if (!res.ok) return setError(res.error);
    setInfo("New link sent. Check your inbox.");
    setSeconds(RESEND_SECONDS);
  }

  if (!email) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Link expired</h1>
        <p className="mt-2 text-sm text-muted">{error ?? "Start again to get a new sign-in link."}</p>
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Check your email</h1>
      <p className="mt-2 text-sm text-muted">
        We sent a sign-in link and a 6-digit code to <strong className="text-ink">{email}</strong>.
      </p>

      <div className="mt-6">
        <CodeInput onComplete={onComplete} disabled={verifying} error={Boolean(error)} />
        <div aria-live="polite" className="mt-3 min-h-5 text-sm">
          {error && <p className="text-danger">{error}</p>}
          {!error && info && <p className="text-success">{info}</p>}
          {verifying && <p className="text-muted">Checking code…</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" variant="secondary" onClick={onResend} disabled={seconds > 0} loading={resending}>
          {seconds > 0 ? `Resend in ${seconds}s` : "Resend email"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Use a different email</Link>
        </Button>
      </div>
    </div>
  );
}
