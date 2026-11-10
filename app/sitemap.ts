import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";
import { publicDb } from "@/lib/public/client";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_APP_URL;
  const staticPaths = ["", "/tournaments", "/how-it-works", "/pricing", "/about", "/contact", "/faq", "/terms", "/privacy", "/refund-policy"];
  const [cities, tournaments, teams, players] = await Promise.all([
    publicDb.from("cities").select("slug").eq("is_active", true).limit(500),
    publicDb.from("public_tournaments").select("id, slug, published_at").eq("visibility", "public").limit(5000),
    publicDb.from("public_teams").select("slug, tournament_id").limit(20000),
    publicDb.from("public_profiles").select("username").not("username", "is", null).limit(20000),
  ]);
  const slugById = new Map((tournaments.data ?? []).map((t) => [t.id, t.slug]));
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const })),
    ...(cities.data ?? []).map((c) => ({ url: `${base}/cities/${c.slug}`, changeFrequency: "daily" as const })),
    ...(tournaments.data ?? []).map((t) => ({ url: `${base}/tournaments/${t.slug}`, lastModified: t.published_at ?? undefined, changeFrequency: "daily" as const })),
    ...(teams.data ?? []).flatMap((t) => {
      const ts = slugById.get(t.tournament_id ?? "");
      return ts ? [{ url: `${base}/tournaments/${ts}/teams/${t.slug}` }] : [];
    }),
    ...(players.data ?? []).map((p) => ({ url: `${base}/players/${p.username}` })),
  ];
}
