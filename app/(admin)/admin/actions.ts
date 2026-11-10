"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env.server";
import { clientEnv } from "@/lib/env";
import { callEdge } from "@/lib/payments/edge";
import { rpc } from "@/lib/rpc";
import { getErrorMessage } from "@/lib/errors";
import { validateSportConfig } from "@/lib/admin/sport-config";
import { validateTiers } from "@/lib/admin/pricing";
import type { Json } from "@/types/supabase";

type R = { ok: true; message?: string } | { ok: false; error: string };
const uuid = z.string().uuid();
const reasonSchema = z.string().trim().min(3, "Write a reason (at least 3 characters).").max(300);

/** Admin check + reason validation + error shield shared by every action. */
async function run(input: { reason: string }, fn: (ctx: { adminId: string; db: ReturnType<typeof createAdminClient>; reason: string }) => Promise<R>): Promise<R> {
  const reason = reasonSchema.safeParse(input.reason);
  if (!reason.success) return { ok: false, error: reason.error.issues[0].message };
  const { userId } = await requireAdmin();
  try {
    return await fn({ adminId: userId, db: createAdminClient(), reason: reason.data });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m.includes("suspended_until") || m.includes("admin_notes") || m.includes("admin_hidden")) return { ok: false, error: "Run migration 0017 first (see HANDOFF.md), then try again." };
    return { ok: false, error: m === "audit_failed" ? "The change was made but could not be written to the audit log. Tell the engineering owner." : "Something went wrong. Nothing was changed unless stated." };
  }
}

/* ---------------- users ---------------- */

export async function setUserStatus(userId: string, input: { status: string; until?: string; reason: string }): Promise<R> {
  const p = z.object({ status: z.enum(["active", "suspended", "banned"]), until: z.string().optional() }).safeParse(input);
  if (!uuid.safeParse(userId).success || !p.success) return { ok: false, error: "Bad request." };
  return run(input, async ({ adminId, db, reason }) => {
    if (userId === adminId) return { ok: false, error: "You can't change your own account status." };
    const { data: before } = await db.from("profiles").select("status, is_admin").eq("id", userId).maybeSingle();
    if (!before) return { ok: false, error: "User not found." };
    if (before.is_admin) return { ok: false, error: "Remove admin rights before restricting this user." };
    const patch: Record<string, unknown> = { status: p.data.status };
    if (p.data.status === "suspended" && p.data.until) {
      if (Number.isNaN(new Date(p.data.until).getTime()) || new Date(p.data.until) <= new Date()) return { ok: false, error: "The end date must be in the future." };
      patch.suspended_until = new Date(`${p.data.until}T23:59:59+05:30`).toISOString();
    } else patch.suspended_until = null;
    const { error } = await db.from("profiles").update(patch as never).eq("id", userId);
    if (error) throw new Error(error.message);
    if (p.data.status !== "active") await db.auth.admin.signOut(userId, "global").catch(() => {});
    await writeAudit({ actorId: adminId, action: `user_${p.data.status}`, targetType: "profile", targetId: userId, before: { status: before.status }, after: patch, reason });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: p.data.status === "active" ? "User restored" : `User ${p.data.status}` };
  });
}

export async function changeUserCity(userId: string, input: { cityId: string; reason: string }): Promise<R> {
  if (!uuid.safeParse(userId).success || !uuid.safeParse(input.cityId).success) return { ok: false, error: "Choose a city." };
  return run(input, async ({ adminId, db, reason }) => {
    const [{ data: before }, { data: city }] = await Promise.all([db.from("profiles").select("city_id").eq("id", userId).maybeSingle(), db.from("cities").select("id, name").eq("id", input.cityId).maybeSingle()]);
    if (!before || !city) return { ok: false, error: "User or city not found." };
    const { error } = await db.from("profiles").update({ city_id: city.id }).eq("id", userId);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "user_city_changed", targetType: "profile", targetId: userId, before: { city_id: before.city_id }, after: { city_id: city.id }, reason });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: `City changed to ${city.name}` };
  });
}

export async function sendUserEmail(userId: string, input: { subject: string; body: string; reason: string }): Promise<R> {
  const p = z.object({ subject: z.string().trim().min(3).max(120), body: z.string().trim().min(3).max(2000) }).safeParse(input);
  if (!uuid.safeParse(userId).success || !p.success) return { ok: false, error: "Add a subject and a message." };
  return run(input, async ({ adminId, db, reason }) => {
    const { data } = await db.auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) return { ok: false, error: "This user has no email address." };
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string);
    const res = await fetch(`${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject: p.data.subject, title: esc(p.data.subject), body: esc(p.data.body) }),
    });
    if (!res.ok) return { ok: false, error: "The email service refused the message. Check the Resend key." };
    await writeAudit({ actorId: adminId, action: "user_email_sent", targetType: "profile", targetId: userId, after: { subject: p.data.subject }, reason });
    return { ok: true, message: "Email sent" };
  });
}

/* ---------------- tournaments ---------------- */

export async function setTournamentHidden(id: string, input: { hide: string; reason: string }): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Bad request." };
  const hide = input.hide === "yes";
  return run(input, async ({ adminId, db, reason }) => {
    const { data: before } = await db.from("tournaments").select("visibility, slug").eq("id", id).maybeSingle();
    if (!before) return { ok: false, error: "Tournament not found." };
    const { error } = await db.from("tournaments").update((hide ? { visibility: "unlisted", admin_hidden: true } : { visibility: "public", admin_hidden: false }) as never).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: hide ? "tournament_hidden" : "tournament_restored", targetType: "tournament", targetId: id, before, after: { visibility: hide ? "unlisted" : "public" }, reason });
    revalidateTag(`tournament:${id}`, { expire: 0 });
    revalidateTag("tournaments", { expire: 0 });
    revalidatePath(`/admin/tournaments/${id}`);
    return { ok: true, message: hide ? "Tournament hidden from browse" : "Tournament restored" };
  });
}

export async function cancelTournamentAdmin(id: string, input: { reason: string }): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Bad request." };
  return run(input, async ({ adminId, reason }) => {
    const supabase = await createClient(); // the admin's own session: cancel_tournament allows admins and notifies members
    const r = await rpc("cancel_tournament", { p_tournament_id: id, p_reason: reason }, supabase);
    if (r.error) return { ok: false, error: r.error.message };
    await writeAudit({ actorId: adminId, action: "tournament_cancelled_by_admin", targetType: "tournament", targetId: id, after: { reason }, reason });
    revalidateTag(`tournament:${id}`, { expire: 0 });
    revalidatePath(`/admin/tournaments/${id}`);
    return { ok: true, message: "Tournament cancelled" };
  });
}

const STATUSES = ["draft", "paid", "registration_open", "registration_closed", "auction", "squads_locked", "live", "completed", "cancelled"] as const;

export async function forceTournamentStatus(id: string, input: { status: string; reason: string }): Promise<R> {
  const s = z.enum(STATUSES).safeParse(input.status);
  if (!uuid.safeParse(id).success || !s.success) return { ok: false, error: "Choose a status." };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: before } = await db.from("tournaments").select("status").eq("id", id).maybeSingle();
    if (!before) return { ok: false, error: "Tournament not found." };
    // The service role has no auth.uid(), so the tournaments guard trigger lets this through. Every use is audited.
    const { error } = await db.from("tournaments").update({ status: s.data, ...(s.data === "registration_open" ? { published_at: new Date().toISOString() } : {}) }).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "tournament_status_forced", targetType: "tournament", targetId: id, before, after: { status: s.data }, reason });
    revalidateTag(`tournament:${id}`, { expire: 0 });
    revalidatePath(`/admin/tournaments/${id}`);
    return { ok: true, message: `Status set to ${s.data}` };
  });
}

export async function reassignOrganizer(id: string, input: { username: string; reason: string }): Promise<R> {
  const u = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Enter the new organizer's username.").safeParse(input.username);
  if (!uuid.safeParse(id).success || !u.success) return { ok: false, error: u.success ? "Bad request." : u.error.issues[0].message };
  return run(input, async ({ adminId, db, reason }) => {
    const [{ data: t }, { data: to }] = await Promise.all([db.from("tournaments").select("organizer_id").eq("id", id).maybeSingle(), db.from("profiles").select("id, status").eq("username", u.data).maybeSingle()]);
    if (!t || !to) return { ok: false, error: "Tournament or user not found." };
    if (to.status !== "active") return { ok: false, error: "That user's account is restricted." };
    const { error } = await db.from("tournaments").update({ organizer_id: to.id }).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "tournament_organizer_reassigned", targetType: "tournament", targetId: id, before: { organizer_id: t.organizer_id }, after: { organizer_id: to.id }, reason });
    revalidateTag(`tournament:${id}`, { expire: 0 });
    revalidatePath(`/admin/tournaments/${id}`);
    return { ok: true, message: "Organizer reassigned" };
  });
}

export async function addTournamentNote(id: string, input: { note: string; reason: string }): Promise<R> {
  const n = z.string().trim().min(2).max(1000).safeParse(input.note);
  if (!uuid.safeParse(id).success || !n.success) return { ok: false, error: "Write a note." };
  return run({ reason: input.reason || "Internal note" }, async ({ adminId, db, reason }) => {
    const { data: t } = await db.from("tournaments").select("admin_notes").eq("id", id).maybeSingle();
    const prev = (t as { admin_notes?: string | null } | null)?.admin_notes ?? "";
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const { error } = await db.from("tournaments").update({ admin_notes: `${prev}${prev ? "\n" : ""}[${stamp}] ${n.data}` } as never).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "tournament_note_added", targetType: "tournament", targetId: id, after: { note: n.data }, reason });
    revalidatePath(`/admin/tournaments/${id}`);
    return { ok: true, message: "Note added" };
  });
}

/* ---------------- payments, subscriptions, refunds ---------------- */

export async function markForRefund(paymentType: "tournament" | "subscription", paymentId: string, input: { reason: string }): Promise<R> {
  if (!uuid.safeParse(paymentId).success || !["tournament", "subscription"].includes(paymentType)) return { ok: false, error: "Bad request." };
  return run(input, async ({ adminId, db, reason }) => {
    const table = paymentType === "tournament" ? "tournament_payments" : "subscription_payments";
    const { data: p } = await db.from(table).select("id, status").eq("id", paymentId).maybeSingle();
    if (!p || p.status !== "paid") return { ok: false, error: "Only paid payments can be refunded." };
    const { data: open } = await db.from("refunds").select("id").eq("payment_id", paymentId).in("status", ["requested", "approved"]).limit(1);
    if (open && open.length > 0) return { ok: false, error: "There is already an open refund for this payment." };
    const { data: r, error } = await db.from("refunds").insert({ payment_type: paymentType, payment_id: paymentId, requested_by: adminId, reason }).select("id").single();
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "refund_marked", targetType: "refund", targetId: r.id, after: { payment_id: paymentId, payment_type: paymentType }, reason });
    revalidatePath("/admin/refunds");
    return { ok: true, message: "Added to the refund queue" };
  });
}

export async function processRefund(refundId: string, input: { decision: string; reason: string }): Promise<R> {
  const d = z.enum(["approve", "reject"]).safeParse(input.decision);
  if (!uuid.safeParse(refundId).success || !d.success) return { ok: false, error: "Choose approve or reject." };
  return run(input, async ({ reason }) => {
    const r = await callEdge<{ ok: boolean }>("process-refund", { refund_id: refundId, action: d.data, reason });
    if (!r.ok) return { ok: false, error: getErrorMessage(r.error) };
    revalidatePath("/admin/refunds");
    return { ok: true, message: d.data === "approve" ? "Refund sent to Razorpay. It shows as processed after the webhook." : "Refund rejected" };
  });
}

export async function cancelSubscriptionAdmin(subId: string, input: { reason: string }): Promise<R> {
  if (!uuid.safeParse(subId).success) return { ok: false, error: "Bad request." };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: s } = await db.from("subscriptions").select("id, status, razorpay_subscription_id, cancel_at_period_end").eq("id", subId).maybeSingle();
    if (!s || s.status !== "active") return { ok: false, error: "Only active subscriptions can be cancelled." };
    if (serverEnv.RAZORPAY_KEY_ID && serverEnv.RAZORPAY_KEY_SECRET && s.razorpay_subscription_id) {
      const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${s.razorpay_subscription_id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${serverEnv.RAZORPAY_KEY_ID}:${serverEnv.RAZORPAY_KEY_SECRET}`).toString("base64")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      });
      if (!res.ok) return { ok: false, error: "Razorpay refused the cancellation. Nothing was changed." };
    }
    const { error } = await db.from("subscriptions").update({ cancel_at_period_end: true }).eq("id", subId);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "subscription_cancelled_by_admin", targetType: "subscription", targetId: subId, before: { cancel_at_period_end: s.cancel_at_period_end }, after: { cancel_at_period_end: true }, reason });
    revalidatePath("/admin/subscriptions");
    return { ok: true, message: "Cancelled at the end of the period" };
  });
}

export async function grantFreePeriod(subId: string, input: { days: string; reason: string }): Promise<R> {
  const days = z.coerce.number().int().min(1).max(365).safeParse(input.days);
  if (!uuid.safeParse(subId).success || !days.success) return { ok: false, error: "Enter a number of days between 1 and 365." };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: s } = await db.from("subscriptions").select("id, status, current_period_end").eq("id", subId).maybeSingle();
    if (!s) return { ok: false, error: "Subscription not found." };
    const base = s.current_period_end && new Date(s.current_period_end) > new Date() ? new Date(s.current_period_end) : new Date();
    const next = new Date(base.getTime() + days.data * 86400000).toISOString();
    const { error } = await db.from("subscriptions").update({ current_period_end: next, status: s.status === "expired" || s.status === "created" ? "active" : s.status }).eq("id", subId);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "subscription_free_period", targetType: "subscription", targetId: subId, before: { current_period_end: s.current_period_end }, after: { current_period_end: next, days: days.data }, reason });
    revalidatePath("/admin/subscriptions");
    return { ok: true, message: `Added ${days.data} days` };
  });
}

/* ---------------- reports ---------------- */

export async function resolveReport(reportId: string, input: { action: string; reason: string }): Promise<R> {
  const a = z.enum(["dismiss", "resolve", "delete_content", "mute_user", "suspend_user", "hide_tournament"]).safeParse(input.action);
  if (!uuid.safeParse(reportId).success || !a.success) return { ok: false, error: "Choose an action." };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: rep } = await db.from("reports").select("id, target_type, target_id, snapshot, status").eq("id", reportId).maybeSingle();
    if (!rep) return { ok: false, error: "Report not found." };
    const snap = (rep.snapshot ?? {}) as { user_id?: string; tournament_id?: string };
    const userOf = () => (rep.target_type === "chat_message" ? snap.user_id : rep.target_type === "profile" ? rep.target_id : null);
    let after: Record<string, unknown> = {};
    if (a.data === "delete_content") {
      if (rep.target_type !== "chat_message" || !rep.target_id) return { ok: false, error: "Only chat messages can be deleted here." };
      await db.from("chat_messages").update({ is_deleted: true, deleted_by: adminId, body: "[deleted]" }).eq("id", rep.target_id);
      after = { deleted_message: rep.target_id };
    } else if (a.data === "mute_user") {
      const uid = userOf();
      const tid = snap.tournament_id;
      if (!uid || !tid) return { ok: false, error: "This report has no user and tournament to mute." };
      await db.from("chat_mutes").upsert({ tournament_id: tid, user_id: uid, muted_until: new Date(Date.now() + 86400000).toISOString(), muted_by: adminId }, { onConflict: "tournament_id,user_id" });
      after = { muted_user: uid, hours: 24 };
    } else if (a.data === "suspend_user") {
      const uid = userOf();
      if (!uid) return { ok: false, error: "This report has no user to suspend." };
      const { data: target } = await db.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
      if (target?.is_admin || uid === adminId) return { ok: false, error: "That account can't be suspended from here." };
      await db.from("profiles").update({ status: "suspended" }).eq("id", uid);
      await db.auth.admin.signOut(uid, "global").catch(() => {});
      after = { suspended_user: uid };
    } else if (a.data === "hide_tournament") {
      const tid = rep.target_type === "tournament" ? rep.target_id : snap.tournament_id;
      if (!tid) return { ok: false, error: "This report has no tournament." };
      await db.from("tournaments").update({ visibility: "unlisted" }).eq("id", tid);
      revalidateTag(`tournament:${tid}`, { expire: 0 });
      after = { hidden_tournament: tid };
    }
    const status = a.data === "dismiss" ? "dismissed" : "resolved";
    await db.from("reports").update({ status, resolved_by: adminId, note: reason }).eq("id", reportId);
    await writeAudit({ actorId: adminId, action: `report_${a.data}`, targetType: "report", targetId: reportId, after, reason });
    revalidatePath("/admin/reports");
    return { ok: true, message: status === "dismissed" ? "Report dismissed" : "Report resolved" };
  });
}

/* ---------------- cities and sports ---------------- */

const citySchema = z.object({ name: z.string().trim().min(2).max(60), state: z.string().trim().max(60).optional(), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."), sortOrder: z.coerce.number().int().min(0).max(1000).default(0), isActive: z.enum(["yes", "no"]) });

export async function saveCity(id: string | null, input: { name: string; state?: string; slug: string; sortOrder?: string; isActive: string; reason: string }): Promise<R> {
  const p = citySchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  return run(input, async ({ adminId, db, reason }) => {
    const row = { name: p.data.name, state: p.data.state || null, slug: p.data.slug, sort_order: p.data.sortOrder, is_active: p.data.isActive === "yes" };
    const res = id ? await db.from("cities").update(row).eq("id", id).select("id").single() : await db.from("cities").insert(row).select("id").single();
    if (res.error) return { ok: false, error: res.error.code === "23505" ? "A city with that link name already exists." : "Couldn't save the city." };
    await writeAudit({ actorId: adminId, action: id ? "city_updated" : "city_created", targetType: "city", targetId: res.data.id, after: row, reason });
    revalidateTag("cities", { expire: 0 });
    revalidatePath("/admin/cities");
    return { ok: true, message: id ? "City updated" : "City added" };
  });
}

export async function addCityFromRequest(requestId: string, input: { reason: string }): Promise<R> {
  if (!uuid.safeParse(requestId).success) return { ok: false, error: "Bad request." };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: rq } = await db.from("city_requests").select("id, city_name, status").eq("id", requestId).maybeSingle();
    if (!rq || rq.status !== "open") return { ok: false, error: "That request is already handled." };
    const slug = rq.city_name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    if (!slug) return { ok: false, error: "Couldn't make a link name from that city. Add it manually." };
    const { data: city, error } = await db.from("cities").insert({ name: rq.city_name.trim().slice(0, 60), slug, is_active: true, sort_order: 100 }).select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "A city with that name already exists." : "Couldn't add the city." };
    await db.from("city_requests").update({ status: "done" }).eq("city_name", rq.city_name).eq("status", "open");
    await writeAudit({ actorId: adminId, action: "city_created_from_request", targetType: "city", targetId: city.id, after: { name: rq.city_name }, reason });
    revalidateTag("cities", { expire: 0 });
    revalidatePath("/admin/cities");
    return { ok: true, message: "City added and activated" };
  });
}

export async function saveSportConfig(sportId: string, input: { config: string; reason: string }): Promise<R> {
  if (!uuid.safeParse(sportId).success) return { ok: false, error: "Bad request." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.config);
  } catch {
    return { ok: false, error: "That isn't valid JSON." };
  }
  const v = validateSportConfig(parsed);
  if (!v.ok) return { ok: false, error: v.error };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: before } = await db.from("sports").select("config").eq("id", sportId).maybeSingle();
    const { error } = await db.from("sports").update({ config: v.config as unknown as NonNullable<Json> }).eq("id", sportId);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: "sport_config_updated", targetType: "sport", targetId: sportId, before: before?.config, after: v.config, reason });
    revalidateTag("sports", { expire: 0 });
    revalidatePath("/admin/sports");
    return { ok: true, message: "Sport rules saved" };
  });
}

/* ---------------- pricing (versioned) ---------------- */

const tierSchema = z.object({ name: z.string().trim().min(2).max(60), minTeams: z.coerce.number().int().min(1), maxTeams: z.coerce.number().int().min(1), amountRupees: z.coerce.number().min(0).max(1_000_000), sortOrder: z.coerce.number().int().min(0).max(100).default(0) });

export async function saveTier(id: string | null, input: { name: string; minTeams: string; maxTeams: string; amountRupees: string; sortOrder?: string; reason: string }): Promise<R> {
  const p = tierSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: active } = await db.from("pricing_tiers").select("id, name, min_teams, max_teams, amount_paise, version, sort_order").eq("is_active", true);
    const err = validateTiers([...(active ?? []).filter((t) => t.id !== id).map((t) => ({ id: t.id, min: t.min_teams, max: t.max_teams })), { id: id ?? "new", min: p.data.minTeams, max: p.data.maxTeams }]);
    if (err) return { ok: false, error: err };
    const old = id ? (active ?? []).find((t) => t.id === id) : null;
    const row = { name: p.data.name, min_teams: p.data.minTeams, max_teams: p.data.maxTeams, amount_paise: Math.round(p.data.amountRupees * 100), sort_order: p.data.sortOrder, is_active: true, version: (old?.version ?? 0) + 1 };
    // New version row. The old one is deactivated first (the overlap constraint only looks at active rows) and restored if the insert fails.
    if (old) await db.from("pricing_tiers").update({ is_active: false }).eq("id", old.id);
    const { data: created, error } = await db.from("pricing_tiers").insert(row).select("id").single();
    if (error) {
      if (old) await db.from("pricing_tiers").update({ is_active: true }).eq("id", old.id);
      return { ok: false, error: "Couldn't save. The team ranges may overlap another tier." };
    }
    await writeAudit({ actorId: adminId, action: old ? "tier_price_changed" : "tier_created", targetType: "pricing_tier", targetId: created.id, before: old, after: row, reason });
    revalidateTag("pricing", { expire: 0 });
    revalidatePath("/admin/pricing");
    return { ok: true, message: "Saved. This applies to new purchases only." };
  });
}

export async function deactivateTier(id: string, input: { reason: string }): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Bad request." };
  return run(input, async ({ adminId, db, reason }) => {
    const { count } = await db.from("pricing_tiers").select("id", { count: "exact", head: true }).eq("is_active", true);
    if ((count ?? 0) <= 1) return { ok: false, error: "At least one active tier is required." };
    await db.from("pricing_tiers").update({ is_active: false }).eq("id", id);
    await writeAudit({ actorId: adminId, action: "tier_deactivated", targetType: "pricing_tier", targetId: id, reason });
    revalidateTag("pricing", { expire: 0 });
    revalidatePath("/admin/pricing");
    return { ok: true, message: "Tier deactivated" };
  });
}

export async function savePlayerPlan(input: { name: string; amountRupees: string; description?: string; benefits?: string; graceDays: string; reason: string }): Promise<R> {
  const p = z.object({ name: z.string().trim().min(2).max(60), amountRupees: z.coerce.number().min(1).max(100000), description: z.string().max(200).optional(), benefits: z.string().max(1000).optional(), graceDays: z.coerce.number().int().min(0).max(30) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: old } = await db.from("player_plans").select("*").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle();
    const row = {
      name: p.data.name, amount_paise: Math.round(p.data.amountRupees * 100), description: p.data.description || null,
      benefits: (p.data.benefits ?? "").split("\n").map((x) => x.trim()).filter(Boolean) as unknown as NonNullable<Json>,
      grace_days: p.data.graceDays, is_active: true, version: (old?.version ?? 0) + 1,
      razorpay_plan_id: null, // create-subscription makes a fresh Razorpay plan for the new price
    };
    if (old) await db.from("player_plans").update({ is_active: false }).eq("id", old.id);
    const { data: created, error } = await db.from("player_plans").insert(row).select("id").single();
    if (error) {
      if (old) await db.from("player_plans").update({ is_active: true }).eq("id", old.id);
      return { ok: false, error: "Couldn't save the plan." };
    }
    await writeAudit({ actorId: adminId, action: "player_plan_changed", targetType: "player_plan", targetId: created.id, before: old ? { amount_paise: old.amount_paise, grace_days: old.grace_days, version: old.version } : null, after: { amount_paise: row.amount_paise, grace_days: row.grace_days, version: row.version }, reason });
    revalidateTag("pricing", { expire: 0 });
    revalidatePath("/admin/pricing");
    return { ok: true, message: "Saved. This applies to new purchases only." };
  });
}

/* ---------------- settings ---------------- */

const SETTING_KEYS = ["faq", "legal", "contact", "banner", "maintenance", "flags", "tax"] as const;

export async function saveSetting(key: string, input: { value: string; reason: string }): Promise<R> {
  const k = z.enum(SETTING_KEYS).safeParse(key);
  if (!k.success) return { ok: false, error: "Unknown setting." };
  let value: unknown;
  try {
    value = JSON.parse(input.value);
  } catch {
    return { ok: false, error: "That isn't valid JSON." };
  }
  const bad = validateSetting(k.data, value);
  if (bad) return { ok: false, error: bad };
  return run(input, async ({ adminId, db, reason }) => {
    const { data: before } = await db.from("site_settings").select("value").eq("key", k.data).maybeSingle();
    const { error } = await db.from("site_settings").upsert({ key: k.data, value: value as NonNullable<Json>, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: adminId, action: `setting_${k.data}_changed`, targetType: "setting", targetId: null, before: before?.value, after: value, reason });
    revalidateTag("site_settings", { expire: 0 });
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved" };
  });
}

function validateSetting(key: (typeof SETTING_KEYS)[number], v: unknown): string | null {
  const o = (v ?? {}) as Record<string, unknown>;
  switch (key) {
    case "faq":
      return Array.isArray(v) && (v as Array<{ q?: string; a?: string }>).every((x) => typeof x?.q === "string" && typeof x?.a === "string") ? null : "FAQ must be a list of items with a question (q) and an answer (a).";
    case "flags":
      return ["live_auction", "chat", "open_team_applications"].every((f) => typeof o[f] === "boolean") ? null : "Flags need live_auction, chat and open_team_applications as true or false.";
    case "maintenance":
      return typeof o.enabled === "boolean" ? null : "Maintenance needs enabled as true or false.";
    case "tax":
      return typeof o.percent === "number" && o.percent >= 0 && o.percent <= 40 && typeof o.prices_include_tax === "boolean" ? null : "Tax needs a percent from 0 to 40 and prices_include_tax as true or false.";
    case "banner":
      return typeof o.enabled === "boolean" && typeof o.text === "string" && o.text.length <= 200 ? null : "Banner needs enabled (true or false) and text (up to 200 characters).";
    case "contact":
      return typeof o.email === "string" && /^\S+@\S+\.\S+$/.test(o.email) ? null : "Contact needs a valid email.";
    case "legal":
      return typeof o.version === "string" && typeof o.updated === "string" ? null : "Legal needs a version and an updated date.";
  }
}
