import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead, Panel, Pill } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { saveSetting } from "../actions";

export const metadata: Metadata = { title: "Settings | Admin", robots: { index: false } };

const DEFAULTS: Record<string, unknown> = {
  faq: [], legal: { version: "1.0", updated: new Date().toISOString().slice(0, 10) }, contact: { email: "support@example.com" },
  banner: { enabled: false, text: "", color: "info" }, maintenance: { enabled: false }, flags: { live_auction: true, chat: true, open_team_applications: true },
};

export default async function AdminSettings() {
  await requireAdmin();
  const { data } = await createAdminClient().from("site_settings").select("key, value").in("key", Object.keys(DEFAULTS)).limit(20);
  const val = (k: string) => (data ?? []).find((r) => r.key === k)?.value ?? DEFAULTS[k];
  const maint = (val("maintenance") as { enabled?: boolean }).enabled === true;
  const flags = val("flags") as Record<string, boolean>;

  const edit = (key: string, label: string, help: string) => (
    <ReasonAction label={label} fields={[{ name: "value", label: help, type: "textarea", defaultValue: JSON.stringify(val(key), null, 2) }]} action={(i) => saveSetting(key, { value: i.value, reason: i.reason })} />
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHead title="Settings" />
      <Panel title="Maintenance mode">
        <p className="text-sm text-muted">When on, visitors see the maintenance page. Admins can still sign in and use the site. Status: <Pill tone={maint ? "bad" : "good"}>{maint ? "ON" : "off"}</Pill></p>
        <div className="mt-3"><ReasonAction label={maint ? "Turn maintenance off" : "Turn maintenance on"} variant={maint ? "primary" : "destructive"} description={maint ? "The site opens to everyone again." : "Everyone except admins sees the maintenance page within about 30 seconds."} action={(i) => saveSetting("maintenance", { value: JSON.stringify({ enabled: !maint }), reason: i.reason })} /></div>
      </Panel>
      <Panel title="Feature flags">
        <ul className="mb-3 flex flex-wrap gap-2 text-sm">{["live_auction", "chat", "open_team_applications"].map((f) => <li key={f}><Pill tone={flags[f] ? "good" : "bad"}>{f.replace(/_/g, " ")}: {flags[f] ? "on" : "off"}</Pill></li>)}</ul>
        {edit("flags", "Edit flags", "Flags (JSON, true or false)")}
      </Panel>
      <Panel title="Announcement banner"><p className="mb-3 text-sm text-muted">Current: <code>{JSON.stringify(val("banner"))}</code></p>{edit("banner", "Edit banner", "Banner (JSON: enabled, text, color, optional start and end dates)")}</Panel>
      <Panel title="Contact email"><p className="mb-3 text-sm text-muted">Current: <code>{(val("contact") as { email?: string }).email}</code></p>{edit("contact", "Edit contact", "Contact (JSON with email)")}</Panel>
      <Panel title="Legal page versions"><p className="mb-3 text-sm text-muted">Shown on Terms, Privacy and Refund pages. Current: <code>{JSON.stringify(val("legal"))}</code>. The page text itself is in the code until the lawyer-reviewed version is final.</p>{edit("legal", "Edit version", "Legal (JSON with version and updated)")}</Panel>
      <Panel title="FAQ"><p className="mb-3 text-sm text-muted">{(val("faq") as unknown[]).length} items. Format: a list of objects with group, q and a. When empty, the default FAQ is shown.</p>{edit("faq", "Edit FAQ", "FAQ (JSON list)")}</Panel>
      <Panel title="Email previews">
        <p className="text-sm text-muted">Transactional emails share one simple layout: title, message and one button. Preview:</p>
        <div className="mt-2 rounded-input border border-line bg-white p-4 text-[#0F2A43]" aria-label="Email preview">
          <h3 className="text-lg font-bold">Auction starts in 15 minutes</h3>
          <p className="mt-1 text-sm">Raipur Premier League</p>
          <p className="mt-3"><span className="inline-block rounded-md bg-[#1F7A4D] px-4 py-2 text-sm text-white">Open</span></p>
        </div>
      </Panel>
    </div>
  );
}
