"use client";

import * as React from "react";
import Link from "next/link";
import { TournamentCard, TournamentCardSkeleton } from "./tournament-card";
import type { TournamentListItem } from "@/lib/public/queries";

export function CityStrip() {
  const [items, setItems] = React.useState<TournamentListItem[] | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const m = document.cookie.match(/(?:^|; )browsing_city=([^;]+)/);
    const city = m ? decodeURIComponent(m[1]) : "";
    const qs = new URLSearchParams(/^[0-9a-f-]{36}$/i.test(city) ? { cityId: city } : {});
    fetch(`/api/public/tournaments?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: { items: TournamentListItem[] }) => !cancelled && setItems(d.items))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (items && items.length === 0) {
    return (
      <p className="text-muted">
        No tournaments to show yet. <Link href="/tournaments" className="font-semibold text-primary hover:underline">Browse all</Link>
      </p>
    );
  }
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {(items ?? [null, null, null]).map((t, i) => (
        <li key={t?.id ?? i}>{t ? <TournamentCard t={t} /> : <TournamentCardSkeleton />}</li>
      ))}
    </ul>
  );
}
