import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, PageHead, Panel, Pill, td } from "@/components/domain/admin/ui";
import { ReasonAction, type ActionField } from "@/components/domain/admin/reason-action";
import { deactivateTier, savePlayerPlan, saveSetting, saveTier } from "../actions";
import { validateTiers } from "@/lib/admin/pricing";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Pricing | Admin", robots: { index: false } };

const tierFields = (t?: { name: string; min_teams: number; max_teams: number; amount_paise: number; sort_order: number }): ActionField[] => [
  { name: "name", label: "Name", required: true, defaultValue: t?.name },
  { name: "minTeams", label: "Minimum teams", type: "number", required: true, defaultValue: t ? String(t.min_teams) : "" },
  { name: "maxTeams", label: "Maximum teams", type: "number", required: true, defaultValue: t ? String(t.max_teams) : "" },
  { name: "amountRupees", label: "Fee in rupees (before tax)", type: "number", required: true, defaultValue: t ? String(t.amount_paise / 100) : "" },
  { name: "sortOrder", label: "Sort order", type: "number", defaultValue: String(t?.sort_order ?? 0) },
];

export default async function AdminPricing() {
  await requireAdmin();
  const db = createAdminClient();
  const [tiers, plan, tax] = await Promise.all([
    db.from("pricing_tiers").select("id, name, min_teams, max_teams, amount_paise, sort_order, version, is_active").order("is_active", { ascending: false }).order("min_teams").limit(60),
    db.from("player_plans").select("name, amount_paise, description, benefits, grace_days, version, razorpay_plan_id").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle(),
    db.from("site_settings").select("value").eq("key", "tax").maybeSingle(),
  ]);
  const active = (tiers.data ?? []).filter((t) => t.is_active);
  const problem = validateTiers(active.map((t) => ({ id: t.id, min: t.min_teams, max: t.max_teams })));
  const p = plan.data;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHead title="Pricing" subtitle="A price change creates a new version and applies to new purchases only." />
      {problem && <p role="alert" className="rounded-input border border-floodlight/60 bg-floodlight/15 p-3 text-sm">Check the tiers: {problem}</p>}
      <Panel title="Organizer tiers" className="overflow-hidden">
        <div className="mb-3"><ReasonAction label="Add tier" variant="primary" description="Applies to new purchases only." fields={tierFields()} action={(i) => saveTier(null, { name: i.name, minTeams: i.minTeams, maxTeams: i.maxTeams, amountRupees: i.amountRupees, sortOrder: i.sortOrder, reason: i.reason })} /></div>
        <DataTable caption="Pricing tiers" head={["Tier", "Teams", "Fee (before tax)", "Version", "Status", ""]}>
          {(tiers.data ?? []).map((t) => (
            <tr key={t.id} className={t.is_active ? "" : "opacity-60"}>
              <td className={td}>{t.name}</td><td className={td}>{t.min_teams} to {t.max_teams}</td><td className={td}>{formatINR(t.amount_paise)}</td><td className={td}>v{t.version}</td>
              <td className={td}><Pill tone={t.is_active ? "good" : "neutral"}>{t.is_active ? "Active" : "Old version"}</Pill></td>
              <td className={`${td} flex gap-2`}>
                {t.is_active && <ReasonAction label="Change" description="This applies to new purchases only." fields={tierFields(t)} action={(i) => saveTier(t.id, { name: i.name, minTeams: i.minTeams, maxTeams: i.maxTeams, amountRupees: i.amountRupees, sortOrder: i.sortOrder, reason: i.reason })} />}
                {t.is_active && <ReasonAction label="Deactivate" variant="destructive" action={(i) => deactivateTier(t.id, { reason: i.reason })} />}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel title="Player pass (30 days)">
        {p ? (
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div><dt className="text-muted">Name</dt><dd className="font-semibold">{p.name}</dd></div>
            <div><dt className="text-muted">Price / 30 days</dt><dd className="font-semibold">{formatINR(p.amount_paise)}</dd></div>
            <div><dt className="text-muted">Grace days</dt><dd className="font-semibold">{p.grace_days}</dd></div>
            <div><dt className="text-muted">Version</dt><dd className="font-semibold">v{p.version}{p.razorpay_plan_id ? "" : " (Razorpay plan is created on the next purchase)"}</dd></div>
          </dl>
        ) : <p className="text-sm text-muted">No active plan.</p>}
        <div className="mt-3">
          <ReasonAction
            label="Change plan" variant="primary" description="Creates a new version. Existing subscribers keep their current price; new purchases use this one."
            fields={[
              { name: "name", label: "Name", required: true, defaultValue: p?.name ?? "Player monthly" },
              { name: "amountRupees", label: "Price for 30 days in rupees", type: "number", required: true, defaultValue: p ? String(p.amount_paise / 100) : "" },
              { name: "graceDays", label: "Grace days after a failed payment", type: "number", defaultValue: String(p?.grace_days ?? 3) },
              { name: "description", label: "Short description", defaultValue: p?.description ?? "" },
              { name: "benefits", label: "Benefits (one per line)", type: "textarea", defaultValue: Array.isArray(p?.benefits) ? (p?.benefits as string[]).join("\n") : "" },
            ]}
            action={(i) => savePlayerPlan({ name: i.name, amountRupees: i.amountRupees, graceDays: i.graceDays, description: i.description, benefits: i.benefits, reason: i.reason })}
          />
        </div>
      </Panel>

      <Panel title="Tax">
        <p className="text-sm text-muted">Current setting: <code>{JSON.stringify(tax.data?.value ?? {})}</code>. Confirm the rate and wording with your accountant before launch.</p>
        <div className="mt-3"><ReasonAction label="Edit tax" fields={[{ name: "value", label: "Tax settings (JSON)", type: "textarea", defaultValue: JSON.stringify(tax.data?.value ?? { percent: 18, prices_include_tax: false }, null, 2) }]} action={(i) => saveSetting("tax", { value: i.value, reason: i.reason })} /></div>
      </Panel>
    </div>
  );
}
