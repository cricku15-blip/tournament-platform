import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead, Panel, Pill } from "@/components/domain/admin/ui";
import { StatTile } from "@/components/ui/stat-tile";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false } };

interface Tiles { users_today: number; users_7d: number; active_tournaments: number; live_auctions: number; organizer_revenue_month_paise: number; active_subscriptions: number; failed_payments_7d: number; open_reports: number; pending_refunds: number; failed_webhooks_24h: number }

// One database call for every tile, cached for 60 seconds.
const load = unstable_cache(
  async () => {
    const db = createAdminClient();
    const since = new Date(Date.now() - 29 * 86400000).toISOString();
    const [tiles, signups, bySport, subs] = await Promise.all([
      // admin_dashboard ships in migration 0017
      (db as unknown as { rpc: (n: string) => Promise<{ data: Tiles | null; error: unknown }> }).rpc("admin_dashboard"),
      db.from("profiles").select("created_at").gte("created_at", since).limit(20000),
      db.from("tournaments").select("sport_id, city_id, sports(name), cities(name)").neq("status", "draft").limit(5000),
      db.from("subscriptions").select("status").limit(20000),
    ]);
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) days[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = 0;
    for (const p of signups.data ?? []) {
      const k = p.created_at.slice(0, 10);
      if (k in days) days[k]++;
    }
    const tally = (rows: Array<Record<string, unknown>>, pick: (r: Record<string, unknown>) => string) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(pick(r), (m.get(pick(r)) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    };
    return {
      tiles: tiles.data,
      tilesError: Boolean(tiles.error),
      signups: Object.entries(days),
      bySport: tally((bySport.data ?? []) as never, (r) => (r.sports as { name?: string } | null)?.name ?? "Unknown"),
      byCity: tally((bySport.data ?? []) as never, (r) => (r.cities as { name?: string } | null)?.name ?? "Unknown"),
      subSplit: tally((subs.data ?? []) as never, (r) => String(r.status)),
    };
  },
  ["admin:dashboard"],
  { revalidate: 60 }
);

function Bars({ rows, label }: { rows: Array<[string, number]>; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ul aria-label={label} className="flex flex-col gap-1.5 text-sm">
      {rows.length === 0 && <li className="text-muted">No data yet.</li>}
      {rows.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[110px_1fr_40px] items-center gap-2">
          <span className="truncate">{k}</span>
          <span className="h-2.5 rounded-full bg-surface"><span className="block h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const d = await load();
  const t = d.tiles;
  const max = Math.max(1, ...d.signups.map((s) => s[1]));
  const pts = d.signups.map(([, v], i) => `${(i / 29) * 300},${60 - (v / max) * 56}`).join(" ");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHead title="Dashboard" subtitle="Updates every minute" />
      {d.tilesError && <p role="alert" className="rounded-input border border-floodlight/60 bg-floodlight/15 p-3 text-sm">The dashboard summary isn&apos;t available until migration 0017 is applied (see HANDOFF.md). Other pages work.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="New users today" value={t?.users_today ?? "–"} subValue={`${t?.users_7d ?? "–"} in 7 days`} />
        <StatTile label="Active tournaments" value={t?.active_tournaments ?? "–"} />
        <StatTile label="Live auctions" value={t?.live_auctions ?? "–"} />
        <StatTile label="Organizer payments (month)" value={t ? formatINR(t.organizer_revenue_month_paise) : "–"} />
        <StatTile label="Active subscriptions" value={t?.active_subscriptions ?? "–"} />
        <StatTile label="Failed payments (7 d)" value={t?.failed_payments_7d ?? "–"} />
        <StatTile label="Open reports" value={t?.open_reports ?? "–"} />
        <StatTile label="Pending refunds" value={t?.pending_refunds ?? "–"} />
        <StatTile label="Failed webhooks (24 h)" value={t?.failed_webhooks_24h ?? "–"} />
      </div>

      <Panel title="Needs attention">
        <ul className="flex flex-col gap-2 text-sm">
          <li><Link className="font-semibold text-primary hover:underline" href="/admin/reports">Open reports</Link> <Pill tone={(t?.open_reports ?? 0) > 0 ? "warn" : "neutral"}>{t?.open_reports ?? "–"}</Pill></li>
          <li><Link className="font-semibold text-primary hover:underline" href="/admin/refunds">Refund requests</Link> <Pill tone={(t?.pending_refunds ?? 0) > 0 ? "warn" : "neutral"}>{t?.pending_refunds ?? "–"}</Pill></li>
          <li><Link className="font-semibold text-primary hover:underline" href="/admin/payments">Failed webhooks</Link> <Pill tone={(t?.failed_webhooks_24h ?? 0) > 0 ? "bad" : "neutral"}>{t?.failed_webhooks_24h ?? "–"}</Pill></li>
        </ul>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Sign-ups per day (30 days)">
          <svg role="img" aria-label={`Sign-ups per day, peak ${max}`} viewBox="0 0 300 64" className="w-full"><polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="2" /></svg>
          <p className="sr-only">{d.signups.map(([k, v]) => `${k}: ${v}`).join(", ")}</p>
        </Panel>
        <Panel title="Subscriptions by status"><Bars rows={d.subSplit} label="Subscriptions by status" /></Panel>
        <Panel title="Tournaments by sport"><Bars rows={d.bySport} label="Tournaments by sport" /></Panel>
        <Panel title="Tournaments by city"><Bars rows={d.byCity} label="Tournaments by city" /></Panel>
      </div>
    </div>
  );
}
