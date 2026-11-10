import * as React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 text-ink overflow-hidden select-none">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-120px] h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />

      <div className="relative z-10 mb-8 text-center">
        <Link
          href="/"
          className="font-display text-3xl font-extrabold tracking-tight text-ink hover:text-primary transition-colors"
        >
          GROUND<span className="text-primary">WAR</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-card border border-line bg-card/90 p-6 backdrop-blur-md sm:p-8">
        {children}
      </div>

      <div className="relative z-10 mt-6 text-center text-xs text-muted">
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>{" "}
        •{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>{" "}
        •{" "}
        <Link href="/contact" className="hover:underline">
          Support
        </Link>
      </div>
    </div>
  );
}
