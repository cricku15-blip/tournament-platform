export interface IcsEvent {
  uid: string;
  start: string; // ISO
  durationMinutes: number;
  summary: string;
  location?: string | null;
  description?: string;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 lines must be folded at 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74));
  return parts.join("\r\n");
}

export function buildIcs(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GroundWar//Fixtures//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(name)}`];
  for (const e of events) {
    const start = new Date(e.start);
    const end = new Date(start.getTime() + e.durationMinutes * 60000);
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@groundwar`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
