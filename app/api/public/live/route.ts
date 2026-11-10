import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { publicDb } from "@/lib/public/client";

const find = unstable_cache(
  async (cityId: string | null) => {
    // Live auctions first, then live matches, in the visitor's city (or anywhere when no city is chosen).
    let t = publicDb.from("public_tournaments").select("id, name, slug, city_id, squad_mode").in("status", ["auction", "live", "registration_closed"]).limit(40);
    if (cityId) t = t.eq("city_id", cityId);
    const { data: tours } = await t;
    const list = tours ?? [];
    const ids = list.map((x) => x.id).filter((x): x is string => !!x);
    if (ids.length === 0) return null;
    const { data: auctions } = await publicDb.from("auction_settings").select("tournament_id").in("tournament_id", ids).eq("status", "live").limit(1);
    const a = auctions?.[0] ? list.find((x) => x.id === auctions[0].tournament_id) : null;
    if (a?.slug) return { title: `Auction live: ${a.name}`, href: `/tournaments/${a.slug}/auction/live`, label: "Watch auction" };
    const { data: matches } = await publicDb.from("matches").select("tournament_id").in("tournament_id", ids).eq("status", "live").eq("fixture_published", true).limit(1);
    const m = matches?.[0] ? list.find((x) => x.id === matches[0].tournament_id) : null;
    if (m?.slug) return { title: `Match live: ${m.name}`, href: `/tournaments/${m.slug}/fixtures`, label: "Follow live" };
    return null;
  },
  ["public:live-strip"],
  { revalidate: 30, tags: ["tournaments"] }
);

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("cityId");
  const cityId = city && /^[0-9a-f-]{36}$/i.test(city) ? city : null;
  const live = await find(cityId).catch(() => null);
  return NextResponse.json({ live }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
