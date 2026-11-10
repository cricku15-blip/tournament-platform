export const NOTIFICATION_CATEGORIES = [
  { key: "tournament", label: "Tournaments", help: "Registration, fixtures and results.", locked: false },
  { key: "team", label: "Teams and squads", help: "Applications, invites and squad changes.", locked: false },
  { key: "auction", label: "Auctions", help: "Auction start times and outcomes.", locked: false },
  { key: "chat", label: "Chat and announcements", help: "Organizer announcements and mentions.", locked: false },
  { key: "billing", label: "Billing", help: "Payments, receipts and renewals. Always on.", locked: true },
  { key: "security", label: "Security", help: "Sign-ins and account changes. Always on.", locked: true },
] as const;

export type NotificationPrefs = Record<string, { inapp: boolean; email: boolean }>;

export function normalisePrefs(raw: unknown): NotificationPrefs {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, Partial<{ inapp: boolean; email: boolean }>>;
  const out: NotificationPrefs = {};
  for (const c of NOTIFICATION_CATEGORIES) {
    out[c.key] = c.locked
      ? { inapp: true, email: true }
      : { inapp: src[c.key]?.inapp ?? true, email: src[c.key]?.email ?? true };
  }
  return out;
}
