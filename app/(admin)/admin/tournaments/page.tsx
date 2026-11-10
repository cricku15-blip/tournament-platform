import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, Field, FilterForm, MoreLink, PageHead, Pill, inputCls, td } from "@/components/domain/admin/ui";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/public/labels";

export const metadata: Metadata = { title: "Tournaments | Admin", robots: { index: false } };
const PAGE = 30;
const STATUSES = ["draft", "paid", "registration_open", "registration_closed", "auction", "squads_locked", "live", "completed", "cancelled"];

export default async function AdminTournaments({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const q = (sp.q ?? "").trim().slice(0, 60);
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const sport = /^[0-9a-f-]{36}$/i.test(sp.sport ?? "") ? sp.sport : undefined;
  const city = /^[0-9a-f-]{36}$/i.test(sp.city ?? "") ? sp.city : undefined;
  const pay = ["paid", "unpaid"].includes(sp.pay ?? "") ? sp.pay : undefined;
  const cursor = decodeCursor(sp.cursor);

  const [cities, sports] = await Promise.all([db.from("cities").select("id, name").order("name").limit(200), db.from("sports").select("id, name").order("name").limit(20)]);
  let paidIds: string[] | null = null;
  if (pay) paidIds = [...new Set(((await db.from("tournament_payments").select("tournament_id").eq("status", "paid").limit(5000)).data ?? []).map((x) => x.tournament_id))];

  let query = db.from("tournaments").select("id, name, slug, status, visibility, start_date, created_at, organizer_id, city_id, sport_id").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
  if (status) query = query.eq("status", status as "draft");
  if (sport) query = query.eq("sport_id", sport);
  if (city) query = query.eq("city_id", city);
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_,()"]/g, " ")}%`);
  if (paidIds && pay === "paid") query = paidIds.length ? query.in("id", paidIds.slice(0, 1000)) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  if (paidIds && pay === "unpaid" && paidIds.length) query = query.not("id", "in", `(${paidIds.slice(0, 500).join(",")})`);
  if (cursor) query = query.or(keysetFilter(cursor));
  const { data } = await query;
  const rows = (data ?? []).slice(0, PAGE);
  const last = rows[rows.length - 1];
  const more = (data ?? []).length > PAGE && last ? `/admin/tournaments?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(sport ? { sport } : {}), ...(city ? { city } : {}), ...(pay ? { pay } : {}), cursor: encodeCursor({ t: last.created_at, id: last.id }) })}` : null;
  const cn = new Map((cities.data ?? []).map((c) => [c.id, c.name]));
  const sn = new Map((sports.data ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Tournaments" />
      <FilterForm action="/admin/tournaments">
        <Field label="Name"><input name="q" defaultValue={q} className={inputCls} maxLength={60} /></Field>
        <Field label="Status"><select name="status" defaultValue={status ?? ""} className={inputCls}><option value="">Any</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}</select></Field>
        <Field label="Sport"><select name="sport" defaultValue={sport ?? ""} className={inputCls}><option value="">Any</option>{(sports.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="City"><select name="city" defaultValue={city ?? ""} className={inputCls}><option value="">Any</option>{(cities.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Payment"><select name="pay" defaultValue={pay ?? ""} className={inputCls}><option value="">Any</option><option value="paid">Paid</option><option value="unpaid">Not paid</option></select></Field>
      </FilterForm>
      <DataTable caption="Tournaments" head={["Name", "Sport", "City", "Status", "Visibility", "Starts"]}>
        {rows.map((t) => (
          <tr key={t.id}>
            <td className={td}><Link href={`/admin/tournaments/${t.id}`} className="font-semibold text-primary hover:underline">{t.name}</Link></td>
            <td className={td}>{sn.get(t.sport_id) ?? "–"}</td>
            <td className={td}>{cn.get(t.city_id) ?? "–"}</td>
            <td className={td}><Pill tone={t.status === "live" ? "warn" : t.status === "cancelled" ? "bad" : "neutral"}>{STATUS_LABEL[t.status] ?? t.status}</Pill></td>
            <td className={td}>{t.visibility}</td>
            <td className={td}>{t.start_date ? formatDate(t.start_date) : "–"}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">No tournaments match.</td></tr>}
      </DataTable>
      <MoreLink href={more}>Load more</MoreLink>
    </div>
  );
}
