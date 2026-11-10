import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center text-ink font-body select-none">
      {/* Line-drawn illustration: Pitch Roller / Ground Care */}
      <svg
        className="w-48 h-48 mb-6 stroke-ink dark:stroke-white text-transparent"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Ground */}
        <line x1="20" y1="160" x2="180" y2="160" strokeWidth="2.5" strokeLinecap="round" />

        {/* Heavy Pitch Roller Drum */}
        <circle cx="85" cy="120" r="38" strokeWidth="2.5" />
        <circle cx="85" cy="120" r="10" strokeWidth="2" />

        {/* Roller Handle / T-Bar */}
        <line x1="85" y1="120" x2="145" y2="75" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="140" y1="65" x2="155" y2="85" strokeWidth="3" strokeLinecap="round" />

        {/* Grass tufts */}
        <path d="M 160 160 L 165 148 L 170 160" strokeWidth="1.5" className="stroke-primary" />
        <path d="M 30 160 L 35 150 L 40 160" strokeWidth="1.5" className="stroke-primary" />
      </svg>

      <span className="font-display text-base font-bold text-primary uppercase tracking-wider mb-2">
        Pitch Work In Progress
      </span>

      <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink mb-3">
        We&apos;re making improvements. Back shortly.
      </h1>

      <p className="max-w-md text-base text-muted mb-8 leading-relaxed">
        The pitch is being rolled and prepared for upcoming matches. We will be back online as soon as maintenance is complete.
      </p>

      <div className="flex flex-col items-center gap-4">
        <Button asChild variant="secondary">
          <Link href="/login">Admin sign in</Link>
        </Button>
        <span className="text-xs text-muted">
          Organizers & Managers: check back in a few minutes.
        </span>
      </div>
    </div>
  );
}
