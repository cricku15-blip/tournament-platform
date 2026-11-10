export const CHAT_MAX = 500;
export const EMOJIS = ["😀", "😂", "😍", "👏", "🙌", "🔥", "💪", "🏏", "⚽", "🏆", "🥇", "🎉", "👍", "🙏", "😮", "😢", "😡", "🤝", "👀", "💯", "🎯", "🤞", "😎", "🤩"];

/** Distinct @usernames in a message (max 5), lowercase. */
export function extractMentions(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/(^|\s)@([a-z0-9_]{3,20})\b/gi)) {
    out.add(m[2].toLowerCase());
    if (out.size >= 5) break;
  }
  return [...out];
}

export function dayKey(iso: string, timeZone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

export function dayLabel(iso: string, now = new Date(), timeZone = "Asia/Kolkata"): string {
  const k = dayKey(iso, timeZone);
  if (k === dayKey(now.toISOString(), timeZone)) return "Today";
  if (k === dayKey(new Date(now.getTime() - 86400000).toISOString(), timeZone)) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone }).format(new Date(iso));
}

/** Mute length for "rest of tournament": until the end date (min 1 hour, max 90 days). */
export function muteMinutesUntil(endDate: string | null, now = new Date()): number {
  if (!endDate) return 60 * 24 * 30;
  const mins = Math.round((new Date(`${endDate}T23:59:59+05:30`).getTime() - now.getTime()) / 60000);
  return Math.min(Math.max(mins, 60), 60 * 24 * 90);
}
