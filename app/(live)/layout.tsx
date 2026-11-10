import * as React from "react";
import Link from "next/link";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-ink">
      <header className="flex h-14 items-center border-b border-line bg-card px-4">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">GROUND<span className="text-primary">WAR</span></Link>
      </header>
      <main className="px-3 py-4 sm:px-6">{children}</main>
    </div>
  );
}
