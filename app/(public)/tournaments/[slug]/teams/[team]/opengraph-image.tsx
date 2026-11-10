import { ogCard, OG_SIZE } from "@/lib/public/og";
import { getTeam, getTournamentBySlug } from "@/lib/public/queries";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Team";

export default async function Image({ params }: { params: Promise<{ slug: string; team: string }> }) {
  const { slug, team } = await params;
  const lookup = await getTournamentBySlug(slug);
  if (lookup.kind !== "found") return ogCard({ eyebrow: "GroundWar", title: "Team" });
  const data = await getTeam(lookup.tournament.id, team);
  return ogCard({ eyebrow: lookup.tournament.name, title: data?.team.name ?? "Team", subtitle: data ? `${data.team.squad_size ?? 0} players` : undefined });
}
