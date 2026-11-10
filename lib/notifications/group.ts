export function groupByDay<T extends { created_at: string }>(
  items: T[],
  now = new Date(),
  timeZone = "Asia/Kolkata"
): { today: T[]; earlier: T[] } {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
  const todayKey = day(now);
  const today: T[] = [];
  const earlier: T[] = [];
  for (const i of items) (day(new Date(i.created_at)) === todayKey ? today : earlier).push(i);
  return { today, earlier };
}
