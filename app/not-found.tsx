import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-surface text-ink font-body select-none">
      {/* Line-drawn illustration: Ball missing the stumps */}
      <svg
        className="w-48 h-48 mb-6 stroke-ink dark:stroke-white text-transparent"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Pitch ground line */}
        <line x1="20" y1="170" x2="180" y2="170" strokeWidth="2.5" strokeLinecap="round" />

        {/* 3 Stumps */}
        <line x1="90" y1="90" x2="90" y2="170" strokeWidth="3" strokeLinecap="round" />
        <line x1="105" y1="90" x2="105" y2="170" strokeWidth="3" strokeLinecap="round" />
        <line x1="120" y1="90" x2="120" y2="170" strokeWidth="3" strokeLinecap="round" />

        {/* Bails intact on top */}
        <line x1="87" y1="88" x2="106" y2="88" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="104" y1="88" x2="123" y2="88" strokeWidth="2.5" strokeLinecap="round" />

        {/* Ball missing outside off stump */}
        <circle cx="150" cy="75" r="14" strokeWidth="2.5" />
        {/* Ball seam */}
        <path d="M 140 75 Q 150 68 160 75" strokeWidth="2" strokeDasharray="2 2" />

        {/* Ball trajectory dashed trail */}
        <path
          d="M 40 140 Q 95 100 136 78"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="stroke-muted"
        />
      </svg>

      <span className="font-display text-base font-bold text-primary uppercase tracking-wider mb-2">
        404 • Missed It
      </span>

      <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink mb-3">
        We couldn&apos;t find that page.
      </h1>

      <p className="max-w-md text-base text-muted mb-8 leading-relaxed">
        The link may have moved, expired, or been bowled just outside the off stump.
      </p>

      {/* Search Box */}
      <form
        action="/tournaments"
        method="GET"
        className="relative w-full max-w-sm mb-8"
      >
        <input
          type="text"
          name="q"
          placeholder="Search tournaments, teams..."
          className="w-full h-11 rounded-input border border-line bg-card pl-10 pr-4 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
        />
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted pointer-events-none" />
      </form>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/tournaments">Browse tournaments</Link>
        </Button>
      </div>
    </div>
  );
}
