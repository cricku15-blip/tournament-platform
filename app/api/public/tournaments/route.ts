import { NextResponse, type NextRequest } from "next/server";
import { parseFilters } from "@/lib/public/filters";
import { getCities, listTournaments } from "@/lib/public/queries";

/** Public, cacheable list used by client-side widgets such as the landing city strip. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = parseFilters(Object.fromEntries(params));
  const cityId = params.get("cityId");
  if (cityId && !filters.city) {
    const slug = (await getCities()).find((c) => c.id === cityId)?.slug;
    if (slug) filters.city = slug;
  }
  const r = await listTournaments({ ...filters, page: 1 });
  if (r.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json(
    { items: r.items.slice(0, 3) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
