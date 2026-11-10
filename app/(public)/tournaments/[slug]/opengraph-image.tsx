import { ogCard, OG_SIZE } from "@/lib/public/og";
import { getTournamentBySlug } from "@/lib/public/queries";
import { formatDate } from "@/lib/format";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Tournament";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const lookup = await getTournamentBySlug((await params).slug);
  if (lookup.kind !== "found") return ogCard({ eyebrow: "GroundWar", title: "Tournament" });
  const t = lookup.tournament;
  return ogCard({
    eyebrow: `${t.sport_name} · ${t.city_name}`,
    title: t.name,
    subtitle: t.start_date ? `Starts ${formatDate(t.start_date)}` : undefined,
    accent: t.sport_slug === "football" ? "#C8553D" : "#1F7A4D",
  });
}
