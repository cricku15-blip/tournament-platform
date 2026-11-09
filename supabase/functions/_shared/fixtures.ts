// supabase/functions/_shared/fixtures.ts  (pure functions, no imports, unit-testable)

export type Pair = { round: number; a: string; b: string };

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Circle method. legs=2 repeats every round with home/away swapped.
export function roundRobin(teamIds: string[], legs: 1 | 2): Pair[] {
  const arr: (string | null)[] = [...teamIds];
  if (arr.length % 2 === 1) arr.push(null);              // bye
  const n = arr.length, rounds = n - 1, out: Pair[] = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) out.push(r % 2 === 0 ? { round: r + 1, a, b } : { round: r + 1, a: b, b: a });
    }
    arr.splice(1, 0, arr.pop() as string | null);        // rotate, keep arr[0] fixed
  }
  if (legs === 2) {
    const first = [...out];
    for (const p of first) out.push({ round: p.round + rounds, a: p.b, b: p.a });
  }
  return out;
}

export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((s) => [s, sum - s]);
  }
  return order;
}

export type KONode = {
  round: number; index: number; a: string | null; b: string | null;
  bye: boolean; fromA?: KONode; fromB?: KONode; stage: string; matchNo?: number;
};

// Single elimination with byes for top seeds. `seeded` is ordered best seed first.
export function knockoutTree(seeded: string[]): { nodes: KONode[]; rounds: number } {
  const n = seeded.length;
  let size = 1; while (size < n) size *= 2;
  const rounds = Math.log2(size);
  const order = seedOrder(size);
  const stageName = (r: number) => (r === rounds ? "final" : r === rounds - 1 ? "semi" : r === rounds - 2 ? "quarter" : `round_${r}`);

  let prev: KONode[] = [];
  const nodes: KONode[] = [];
  for (let k = 0; k < size / 2; k++) {
    const a = seeded[order[2 * k] - 1] ?? null, b = seeded[order[2 * k + 1] - 1] ?? null;
    const node: KONode = { round: 1, index: k, a, b, bye: !a || !b, stage: stageName(1) };
    prev.push(node); nodes.push(node);
  }
  for (let r = 2; r <= rounds; r++) {
    const cur: KONode[] = [];
    for (let k = 0; k < prev.length / 2; k++) {
      const fa = prev[2 * k], fb = prev[2 * k + 1];
      const node: KONode = { round: r, index: k, a: fa.bye ? (fa.a ?? fa.b) : null, b: fb.bye ? (fb.a ?? fb.b) : null,
        bye: false, fromA: fa.bye ? undefined : fa, fromB: fb.bye ? undefined : fb, stage: stageName(r) };
      cur.push(node); nodes.push(node);
    }
    prev = cur;
  }
  let no = 1;
  for (const nd of nodes) if (!nd.bye) nd.matchNo = no++;
  return { nodes, rounds };
}

// 'YYYY-MM-DD' + days -> 'YYYY-MM-DD'
export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Spread matches over days/time slots (India time). One team never plays twice in a day because
// callers clamp matchesPerDay to floor(teams / 2) for league rounds.
export function scheduleSlots(count: number, startDate: string, matchesPerDay: number, times: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(i / matchesPerDay), slot = i % matchesPerDay;
    out.push(`${addDays(startDate, day)}T${times[slot % times.length] ?? "10:00"}:00+05:30`);
  }
  return out;
}
