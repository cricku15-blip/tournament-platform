import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

/** Writes an audit row for an admin action. Uses the service role with the acting admin's id. A reason is mandatory. */
export async function writeAudit(o: { actorId: string; action: string; targetType: string; targetId: string | null; before?: unknown; after?: unknown; reason: string }): Promise<void> {
  const { error } = await createAdminClient().from("audit_log").insert({
    actor_id: o.actorId,
    action: o.action,
    target_type: o.targetType,
    target_id: o.targetId,
    before: (o.before ?? null) as Json,
    after: (o.after ?? null) as Json,
    reason: o.reason,
  });
  if (error) throw new Error("audit_failed");
}
