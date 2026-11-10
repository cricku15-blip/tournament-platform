"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UpgradePlan({ id, current, max }: { id: string; current: number; max: number }) {
  const options = Array.from({ length: Math.max(0, max - current) }, (_, i) => current + 1 + i);
  const [target, setTarget] = React.useState(options[0] ?? current);
  if (options.length === 0) return <p className="text-sm text-muted">You&apos;re on the largest plan.</p>;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="up-target" className="mb-1 block text-sm font-semibold">Upgrade to</label>
        <select id="up-target" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="h-11 rounded-input border border-line bg-card px-3">
          {options.map((n) => <option key={n} value={n}>{n} teams</option>)}
        </select>
      </div>
      <Button asChild variant="secondary"><Link href={`/organizer/tournaments/${id}/checkout?upgrade=${target}`}>Upgrade plan</Link></Button>
    </div>
  );
}
