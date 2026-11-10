import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { Field, FilterForm, DataTable, MoreLink, PageHead, Pill, inputCls, td } from "@/components/domain/admin/ui";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Users | Admin", robots: { index: false } };
const PAGE = 30;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const q = (sp.q ?? "").trim().slice(0, 60);
  const status = ["active", "suspended", "banned"].includes(sp.status ?? "") ? sp.status : undefined;
  const city = /^[0-9a-f-]{36}$/i.test(sp.city ?? "") ? sp.city : undefined;
  const role = ["organizer", "manager", "admin"].includes(sp.role ?? "") ? sp.role : undefined;
  const cursor = decodeCursor(sp.cursor);

  const cities = (await db.from("cities").select("id, name").order("name").limit(200)).data ?? [];

  let emailId: string | null = null;
  if (q.includes("@")) {
    const r = await (db as unknown as { rpc: (n: string, a: object) => Promise<{ data: string | null }> }).rpc("admin_find_user_by_email", { p_email: q });
    emailId = r.data;
  }
  let roleIds: string[] | null = null;
  if (role === "organizer") roleIds = [...new Set(((await db.from("tournaments").select("organizer_id").limit(5000)).data ?? []).map((x) => x.organizer_id))];
  if (role === "manager") roleIds = [...new Set(((await db.from("teams").select("manager_id").not("manager_id", "is", null).limit(5000)).data ?? []).map((x) => x.manager_id as string))];

  let query = db.from("profiles").select("id, full_name, username, status, is_admin, city_id, created_at, phone").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
  if (status) query = query.eq("status", status as "active");
  if (city) query = query.eq("city_id", city);
  if (role === "admin") query = query.eq("is_admin", true);
  if (roleIds) query = roleIds.length ? query.in("id", roleIds.slice(0, 1000)) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  if (q) {
    if (q.includes("@")) query = emailId ? query.eq("id", emailId) : query.eq("id", "00000000-0000-0000-0000-000000000000");
    else {
      const like = `%${q.replace(/[\\%_,()"]/g, " ")}%`;
      query = query.or(`full_name.ilike.${like},username.ilike.${like},phone.ilike.${like}`);
    }
  }
  if (cursor) query = query.or(keysetFilter(cursor));
  const { data } = await query;
  const rows = (data ?? []).slice(0, PAGE);
  const last = rows[rows.length - 1];
  const more = (data ?? []).length > PAGE && last ? `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(city ? { city } : {}), ...(role ? { role } : {}), cursor: encodeCursor({ t: last.created_at, id: last.id }) })}` : null;
  const cityName = new Map(cities.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Users" subtitle="Search by name, username, phone or exact email" />
      <FilterForm action="/admin/users">
        <Field label="Search"><input name="q" defaultValue={q} className={inputCls} maxLength={60} /></Field>
        <Field label="City"><select name="city" defaultValue={city ?? ""} className={inputCls}><option value="">All</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Role"><select name="role" defaultValue={role ?? ""} className={inputCls}><option value="">Any</option><option value="organizer">Organizer</option><option value="manager">Manager</option><option value="admin">Admin</option></select></Field>
        <Field label="Status"><select name="status" defaultValue={status ?? ""} className={inputCls}><option value="">Any</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select></Field>
      </FilterForm>
      <DataTable caption="Users" head={["Name", "Username", "City", "Status", "Joined"]}>
        {rows.map((u) => (
          <tr key={u.id}>
            <td className={td}><Link href={`/admin/users/${u.id}`} className="font-semibold text-primary hover:underline">{u.full_name ?? "(no name)"}</Link>{u.is_admin && <> <Pill tone="warn">Admin</Pill></>}</td>
            <td className={td}>{u.username ? `@${u.username}` : "–"}</td>
            <td className={td}>{u.city_id ? cityName.get(u.city_id) ?? "–" : "–"}</td>
            <td className={td}><Pill tone={u.status === "active" ? "good" : "bad"}>{u.status}</Pill></td>
            <td className={td}>{formatDate(u.created_at)}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No users match.</td></tr>}
      </DataTable>
      <MoreLink href={more}>Load more</MoreLink>
    </div>
  );
}
