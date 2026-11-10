import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LeaderRow } from "@/lib/public/queries";

export function LeaderboardCard({ title, rows, limit = 10 }: { title: string; rows: LeaderRow[]; limit?: number }) {
  const shown = rows.slice(0, limit);
  return (
    <section className="rounded-card border border-line bg-card p-4">
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No qualifying players yet.</p>
      ) : (
        <ol className="mt-3 divide-y divide-line">
          {shown.map((r, i) => (
            <li key={r.player_id} className="flex min-h-11 items-center gap-3 py-2">
              <span className={cn("w-6 font-display font-bold", i === 0 ? "text-primary" : "text-muted")}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                {r.username ? (
                  <Link href={`/players/${r.username}`} className="truncate font-semibold hover:text-primary">
                    {r.name}
                  </Link>
                ) : (
                  <span className="truncate font-semibold">{r.name}</span>
                )}
                {r.sub && <p className="text-xs text-muted">{r.sub}</p>}
              </div>
              <span className="font-display text-xl font-bold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
