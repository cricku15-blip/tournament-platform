import * as React from "react";
import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-ink">
      <header className="flex h-16 items-center border-b border-line bg-card px-4 sm:px-6">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
          GROUND<span className="text-primary">WAR</span>
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
