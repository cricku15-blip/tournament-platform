import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDate } from "@/lib/format";
import { SQUAD_MODE_LABEL, STATUS_LABEL, sportEdgeClass, statusVariant } from "@/lib/public/labels";
import type { TournamentListItem } from "@/lib/public/queries";
import { cn } from "@/lib/utils";

export function TournamentCard({ t, priority = false }: { t: TournamentListItem; priority?: boolean }) {
  const joined = t.approved_team_count ?? 0;
  return (
    <article className="group relative overflow-hidden rounded-card border border-line bg-card transition-shadow hover:shadow-md">
      <div className={cn("h-[3px] w-full", sportEdgeClass(t.sport_slug))} aria-hidden />
      <div className="relative aspect-[16/7] w-full bg-surface">
        {t.banner_url ? (
          <Image src={t.banner_url} alt="" fill sizes="(min-width:1024px) 360px, (min-width:640px) 50vw, 100vw" className="object-cover" priority={priority} />
        ) : (
          <div
            className="h-full w-full opacity-60"
            style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--line) 0 2px, transparent 2px 14px)" }}
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(t.status)} pulsing={t.status === "live"}>
            {STATUS_LABEL[t.status] ?? t.status}
          </Badge>
          <Badge variant="neutral">{SQUAD_MODE_LABEL[t.squad_mode] ?? t.squad_mode}</Badge>
        </div>
        <h3 className="font-display text-xl font-bold leading-tight text-ink">
          <Link href={`/tournaments/${t.slug}`} className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-primary">
            {t.name}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {t.sport_name} · {t.city_name}
          {t.start_date ? ` · ${formatDate(t.start_date)}` : ""}
        </p>
        <div>
          <p className="mb-1 text-xs text-muted">
            {joined} of {t.team_count} teams
          </p>
          <ProgressBar value={Math.min(100, (joined / Math.max(1, t.team_count)) * 100)} aria-label={`${joined} of ${t.team_count} teams`} />
        </div>
        {t.organizer_name && <p className="text-xs text-muted">By {t.organizer_name}</p>}
      </div>
    </article>
  );
}

export function TournamentCardSkeleton() {
  return <div className="h-[340px] animate-pulse rounded-card border border-line bg-card" aria-hidden />;
}
