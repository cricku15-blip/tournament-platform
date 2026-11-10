"use client";

import * as React from "react";

/** Demo scoreboard that counts up once on load. Reduced-motion users see the final numbers. */
export function CountUpCard() {
  const target = { runs: 142, wkts: 4 };
  const [n, setN] = React.useState({ runs: 0, wkts: 0 });
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const prefers = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefers) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a browser media query once
      setReduced(true);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setN({ runs: Math.round(target.runs * p), wkts: Math.round(target.wkts * p) });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const v = reduced ? target : n;
  return (
    <div className="rounded-card border border-line bg-card p-6 shadow-sm" aria-label="Example scoreboard">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Example match</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="font-display text-xl font-bold">Raipur Strikers</p>
          <p className="font-display text-6xl font-bold tabular-nums text-ink">{v.runs}/{v.wkts}</p>
          <p className="text-sm text-muted">15.2 overs</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold">Bhilai Kings</p>
          <p className="text-sm text-muted">Need 31 off 22</p>
        </div>
      </div>
    </div>
  );
}
