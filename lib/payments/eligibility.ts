export type ApplyReason = "not_logged_in" | "registration_closed" | "city_mismatch" | "subscription_required" | "already_applied" | "ok";

export interface EligibilityInput {
  loggedIn: boolean;
  status: string;
  allowApplications: boolean;
  deadline: string | null;
  cityMatch: boolean;
  subscribed: boolean;
  alreadyApplied: boolean;
  now?: Date;
}

/** Read-only mirror of apply_as_player's checks, used only to pick the right message. The database is the enforcer. */
export function applyEligibility(i: EligibilityInput): { canApply: boolean; reason: ApplyReason } {
  const now = i.now ?? new Date();
  if (!i.loggedIn) return { canApply: false, reason: "not_logged_in" };
  if (i.status !== "registration_open" || !i.allowApplications || (i.deadline && now > new Date(i.deadline))) return { canApply: false, reason: "registration_closed" };
  if (i.alreadyApplied) return { canApply: false, reason: "already_applied" };
  if (!i.cityMatch) return { canApply: false, reason: "city_mismatch" };
  if (!i.subscribed) return { canApply: false, reason: "subscription_required" };
  return { canApply: true, reason: "ok" };
}

export const REASON_COPY: Record<Exclude<ApplyReason, "ok">, string> = {
  not_logged_in: "Log in to apply.",
  registration_closed: "Registration is closed for this tournament.",
  city_mismatch: "This tournament is in a different city than your profile city.",
  subscription_required: "An active player subscription is required to apply.",
  already_applied: "You have already applied to this tournament.",
};

export type SubscriptionView = "none" | "active" | "cancelling" | "past_due" | "expired";

export function subscriptionView(s: { status: string; cancel_at_period_end: boolean; current_period_end: string | null; grace_until: string | null } | null, now = new Date()): SubscriptionView {
  if (!s || s.status === "created") return "none";
  if (s.status === "active") return s.cancel_at_period_end ? "cancelling" : "active";
  if (s.status === "cancelled") return s.current_period_end && new Date(s.current_period_end) > now ? "cancelling" : "expired";
  if (s.status === "past_due") return "past_due";
  return "expired";
}
