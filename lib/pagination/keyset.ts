export interface Cursor {
  t: string; // created_at
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Cursor;
    if (typeof v.t !== "string" || typeof v.id !== "string") return null;
    if (Number.isNaN(Date.parse(v.t)) || !/^[0-9a-f-]{36}$/i.test(v.id)) return null;
    return v;
  } catch {
    return null;
  }
}

/** PostgREST filter for `(created_at, id) < (t, id)` with the cursor values quoted. */
export function keysetFilter(c: Cursor): string {
  return `created_at.lt."${c.t}",and(created_at.eq."${c.t}",id.lt.${c.id})`;
}
