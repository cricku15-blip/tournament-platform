"use client";

import * as React from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Counts down to `at` (ISO). Calls onReady-style rendering through children(ms) so callers can enable buttons at T-15 min. */
export function Countdown({ at, children }: { at: string; children?: (msLeft: number) => React.ReactNode }) {
  const target = React.useMemo(() => new Date(at).getTime(), [at]);
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => setLeft(target - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  if (left === null) return <span className="inline-block h-6 w-40 animate-pulse rounded bg-surface" aria-hidden />;
  const p = parts(left);
  return (
    <>
      <span role="timer" aria-live="off" className="font-display text-2xl font-bold tabular-nums">
        {left <= 0 ? "Starting any moment" : `${p.d > 0 ? `${p.d}d ` : ""}${String(p.h).padStart(2, "0")}:${String(p.m).padStart(2, "0")}:${String(p.s).padStart(2, "0")}`}
      </span>
      {children?.(left)}
    </>
  );
}
