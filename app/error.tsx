"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId] = React.useState(
    () => error.digest || `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  );

  React.useEffect(() => {
    // Structured error logging
    console.error(`[Error Ref: ${errorId}]`, error);
  }, [error, errorId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center text-ink font-body select-none">
      {/* Line-drawn illustration: Referee's Whistle */}
      <svg
        className="w-44 h-44 mb-6 stroke-ink dark:stroke-white text-transparent"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Whistle Body */}
        <circle cx="85" cy="115" r="40" strokeWidth="2.5" />
        {/* Whistle Barrel */}
        <path
          d="M 105 85 L 165 85 L 165 115 L 125 115"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Whistle Air Vent */}
        <line x1="125" y1="85" x2="125" y2="100" strokeWidth="2.5" />
        {/* Lanyard Ring */}
        <circle cx="50" cy="95" r="8" strokeWidth="2" />
        {/* Sound Waves */}
        <path
          d="M 175 75 Q 185 85 175 95"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-clay"
        />
        <path
          d="M 183 67 Q 197 85 183 103"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-clay"
        />
      </svg>

      <span className="font-display text-base font-bold text-clay uppercase tracking-wider mb-2">
        500 • Play Stopped
      </span>

      <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink mb-3">
        Something went wrong on our side.
      </h1>

      <p className="max-w-md text-base text-muted mb-6 leading-relaxed">
        The referee stopped play for an unexpected issue. Our team has been notified.
      </p>

      {/* Error Reference ID Card */}
      <div className="flex items-center gap-2 rounded-card border border-line bg-card px-4 py-2 text-xs font-mono text-muted mb-8">
        <span>Reference ID:</span>
        <span className="font-bold text-ink">{errorId}</span>
        <CopyButton value={errorId} size="sm" variant="ghost" label="Copy ID" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
