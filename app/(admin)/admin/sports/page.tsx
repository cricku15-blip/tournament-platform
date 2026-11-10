import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead, Panel, Pill } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { saveSportConfig } from "../actions";

export const metadata: Metadata = { title: "Sports | Admin", robots: { index: false } };

type Cfg = { squad?: Record<string, number>; roles?: string[]; match_formats?: Array<{ label: string; overs: number | null }>; points?: Record<string, number>; tiebreakers?: string[]; profile_fields?: Array<{ label: string; options: string[] }> };

export default async function AdminSports() {
  await requireAdmin();
  const { data } = await createAdminClient().from("sports").select("id, slug, name, config, is_active").order("name").limit(20);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHead title="Sports and rules" subtitle="These settings drive the tournament creation form, squad limits and standings." />
      {(data ?? []).map((s) => {
        const c = (s.config ?? {}) as Cfg;
        return (
          <Panel key={s.id} title={s.name}>
            <div className="flex flex-wrap items-center gap-2"><Pill tone={s.is_active ? "good" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</Pill><Pill>{s.slug}</Pill></div>
            {/* Preview of what organizers will see, generated from the saved config */}
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2" aria-label={`${s.name} form preview`}>
              <div><p className="font-semibold">Squad</p><p className="text-muted">{c.squad ? `${c.squad.players_per_side_min} to ${c.squad.players_per_side_max} per side (default ${c.squad.players_per_side_default}), squad up to ${c.squad.squad_max_limit}` : "Not set"}</p></div>
              <div><p className="font-semibold">Player roles</p><p className="text-muted">{c.roles?.join(", ") || "Not set"}</p></div>
              <div><p className="font-semibold">Match formats</p><p className="text-muted">{c.match_formats?.map((f) => f.label).join(", ") || "Not set"}</p></div>
              <div><p className="font-semibold">Points</p><p className="text-muted">{c.points ? Object.entries(c.points).map(([k, v]) => `${k} ${v}`).join(", ") : "Not set"}</p></div>
              <div><p className="font-semibold">Tie-breakers</p><p className="text-muted">{c.tiebreakers?.join(", ") || "Not set"}</p></div>
              <div><p className="font-semibold">Profile fields</p><p className="text-muted">{c.profile_fields?.map((f) => `${f.label} (${f.options.length})`).join(", ") || "None"}</p></div>
            </div>
            <div className="mt-4">
              <ReasonAction label="Edit rules (JSON)" description="Validated before saving: squad limits, roles, formats, points and tie-breakers. Existing tournaments keep the rules they were created with." fields={[{ name: "config", label: "Configuration", type: "textarea", defaultValue: JSON.stringify(s.config, null, 2), required: true }]} action={(i) => saveSportConfig(s.id, { config: i.config, reason: i.reason })} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
