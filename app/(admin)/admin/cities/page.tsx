import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, PageHead, Panel, Pill, td } from "@/components/domain/admin/ui";
import { ReasonAction, type ActionField } from "@/components/domain/admin/reason-action";
import { addCityFromRequest, saveCity } from "../actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Cities | Admin", robots: { index: false } };

const cityFields = (c?: { name: string; state: string | null; slug: string; sort_order: number; is_active: boolean }): ActionField[] => [
  { name: "name", label: "Name", required: true, defaultValue: c?.name },
  { name: "state", label: "State", defaultValue: c?.state ?? "" },
  { name: "slug", label: "Link name (lowercase, hyphens)", required: true, defaultValue: c?.slug },
  { name: "sortOrder", label: "Sort order", type: "number", defaultValue: String(c?.sort_order ?? 100) },
  { name: "isActive", label: "Active", type: "select", options: [{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }], defaultValue: c?.is_active === false ? "no" : "yes" },
];

export default async function AdminCities() {
  await requireAdmin();
  const db = createAdminClient();
  const [cities, reqs, counts] = await Promise.all([
    db.from("cities").select("id, name, state, slug, sort_order, is_active").order("sort_order").order("name").limit(300),
    db.from("city_requests").select("city_name, status, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(300),
    db.from("profiles").select("city_id").not("city_id", "is", null).limit(20000),
  ]);
  const users = new Map<string, number>();
  for (const p of counts.data ?? []) if (p.city_id) users.set(p.city_id, (users.get(p.city_id) ?? 0) + 1);
  // Group requests by name (case-insensitive) and keep one id per group for the one-click add.
  const grouped = new Map<string, { name: string; n: number; last: string }>();
  for (const r of reqs.data ?? []) {
    const k = r.city_name.trim().toLowerCase();
    const g = grouped.get(k);
    grouped.set(k, { name: g?.name ?? r.city_name.trim(), n: (g?.n ?? 0) + 1, last: g && g.last > r.created_at ? g.last : r.created_at });
  }
  const reqRows = await db.from("city_requests").select("id, city_name").eq("status", "open").limit(300);
  const idFor = (name: string) => reqRows.data?.find((x) => x.city_name.trim().toLowerCase() === name.toLowerCase())?.id;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHead title="Cities" actions={<ReasonAction label="Add city" variant="primary" fields={cityFields()} action={(i) => saveCity(null, { name: i.name, state: i.state, slug: i.slug, sortOrder: i.sortOrder, isActive: i.isActive, reason: i.reason })} />} />
      <DataTable caption="Cities" head={["City", "Link", "Users", "Status", ""]}>
        {(cities.data ?? []).map((c) => (
          <tr key={c.id}>
            <td className={td}><span className="font-semibold">{c.name}</span>{c.state && <span className="text-muted">, {c.state}</span>}</td><td className={td}>{c.slug}</td><td className={td}>{users.get(c.id) ?? 0}</td>
            <td className={td}><Pill tone={c.is_active ? "good" : "neutral"}>{c.is_active ? "Active" : "Inactive"}</Pill></td>
            <td className={td}><ReasonAction label="Edit" fields={cityFields(c)} action={(i) => saveCity(c.id, { name: i.name, state: i.state, slug: i.slug, sortOrder: i.sortOrder, isActive: i.isActive, reason: i.reason })} /></td>
          </tr>
        ))}
      </DataTable>
      <Panel title="City requests">
        <DataTable caption="City requests" head={["City", "Requests", "Last", ""]}>
          {[...grouped.values()].sort((a, b) => b.n - a.n).map((g) => {
            const rid = idFor(g.name);
            return (
              <tr key={g.name}>
                <td className={td}>{g.name}</td><td className={td}>{g.n}</td><td className={td}>{formatDate(g.last)}</td>
                <td className={td}>{rid && <ReasonAction label="Add city" variant="primary" reasonLabel="Note" action={(i) => addCityFromRequest(rid, { reason: i.reason })} />}</td>
              </tr>
            );
          })}
          {grouped.size === 0 && <tr><td colSpan={4} className="px-3 py-4 text-muted">No open requests.</td></tr>}
        </DataTable>
      </Panel>
    </div>
  );
}
