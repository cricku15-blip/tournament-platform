import { ogCard, OG_SIZE } from "@/lib/public/og";
import { getMatch, getTournamentBySlug, getTournamentTeams } from "@/lib/public/queries";
import { scoreText } from "@/components/domain/public/fixture-ticket";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Match";

export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const lookup = await getTournamentBySlug(slug);
  if (lookup.kind !== "found" || !/^[0-9a-f-]{36}$/i.test(id)) return ogCard({ eyebrow: "GroundWar", title: "Match" });
  const t = lookup.tournament;
  const [data, teams] = await Promise.all([getMatch(t.id, id), getTournamentTeams(t.id)]);
  if (!data) return ogCard({ eyebrow: t.name, title: "Match" });
  const name = (tid: string | null, label: string | null) => teams.find((x) => x.id === tid)?.name ?? label ?? "TBD";
  const m = data.match;
  const published = m.result_published_at !== null;
  const sa = published ? scoreText(m.score_a, t.sport_slug) : null;
  const sb = published ? scoreText(m.score_b, t.sport_slug) : null;
  return ogCard({
    eyebrow: t.name,
    title: `${name(m.team_a_id, m.label_a)} ${sa ?? ""} v ${sb ?? ""} ${name(m.team_b_id, m.label_b)}`.replace(/\s+/g, " "),
    subtitle: m.result_text ?? undefined,
  });
}
