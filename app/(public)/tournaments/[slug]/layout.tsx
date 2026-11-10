import * as React from "react";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team-logo";
import { ShareButtons } from "@/components/domain/public/share-buttons";
import { TournamentActions } from "@/components/domain/public/tournament-actions";
import { TournamentTabs } from "@/components/domain/public/tournament-tabs";
import { clientEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { FORMAT_LABEL, SQUAD_MODE_LABEL, STATUS_LABEL, statusVariant } from "@/lib/public/labels";
import { getTournamentBySlug } from "@/lib/public/queries";

export default async function TournamentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lookup = await getTournamentBySlug(slug);
  if (lookup.kind === "missing") notFound();
  if (lookup.kind === "redirect") permanentRedirect(`/tournaments/${lookup.slug}`);
  const t = lookup.tournament;
  const url = `${clientEnv.NEXT_PUBLIC_APP_URL}/tournaments/${t.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {t.status === "cancelled" && (
        <div role="alert" className="mt-4 rounded-card border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <strong>This tournament was cancelled.</strong> {t.cancelled_reason}
        </div>
      )}
      <div className="relative mt-4 h-60 w-full overflow-hidden rounded-card bg-surface">
        {t.banner_url ? (
          <Image src={t.banner_url} alt="" fill priority sizes="(min-width:1152px) 1152px, 100vw" className="object-cover" />
        ) : (
          <div className="h-full w-full opacity-60" style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--line) 0 2px, transparent 2px 14px)" }} aria-hidden />
        )}
      </div>
      <header className="-mt-10 flex flex-col gap-4 px-2 sm:px-6">
        <div className="flex items-end gap-4">
          <div className="rounded-card border-4 border-card bg-card">
            <TeamLogo src={t.logo_url} name={t.name} size="xl" />
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={statusVariant(t.status)} pulsing={t.status === "live"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
              <Badge variant="neutral">{t.sport_name}</Badge>
              <Badge variant="neutral">{FORMAT_LABEL[t.format] ?? t.format}</Badge>
              <Badge variant="neutral">{SQUAD_MODE_LABEL[t.squad_mode] ?? t.squad_mode}</Badge>
            </div>
            <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{t.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {t.city_name}
              {t.start_date ? ` · ${formatDate(t.start_date)}${t.end_date ? ` to ${formatDate(t.end_date)}` : ""}` : ""}
              {t.organizer_name ? ` · Organized by ${t.organizer_name}` : ""}
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <TournamentActions
              id={t.id}
              slug={t.slug}
              status={t.status}
              allowPlayers={Boolean(t.allow_player_applications)}
              teamEntry={String(t.team_entry)}
            />
            <ShareButtons url={url} title={t.name} />
          </div>
        </div>
      </header>
      <div className="mt-6">
        <TournamentTabs base={`/tournaments/${t.slug}`} showAuction={t.squad_mode === "auction"} />
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
