import * as React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-surface text-ink overflow-hidden select-none">
      {/* Faint Pitch-Line Pattern SVG */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full stroke-ink/5 dark:stroke-white/5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <pattern
          id="pitch-lines"
          width="160"
          height="160"
          patternUnits="userSpaceOnUse"
        >
          <rect width="160" height="160" fill="none" strokeWidth="1" />
          <circle cx="80" cy="80" r="40" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2="160" y2="80" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#pitch-lines)" />
      </svg>

      <div className="relative z-10 mb-8 text-center">
        <Link
          href="/"
          className="font-display text-3xl font-extrabold tracking-tight text-ink hover:text-primary transition-colors"
        >
          GROUND<span className="text-primary">WAR</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-card border border-line bg-card p-6 sm:p-8 shadow-sm">
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
