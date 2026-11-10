import { roundRobin, knockoutTree, seedOrder, scheduleSlots } from "./fixtures.ts";
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { console.log("FAIL", m); fail++; } };
for (const n of [3, 4, 5, 6, 7, 8]) {
  const t = Array.from({ length: n }, (_, i) => "T" + i);
  for (const legs of [1, 2] as const) {
    const m = roundRobin(t, legs);
    ok(m.length === (n * (n - 1) / 2) * legs, `rr count n=${n} legs=${legs}: ${m.length}`);
    const pairs = new Map<string, number>();
    m.forEach((p) => { const k = [p.a, p.b].sort().join("-"); pairs.set(k, (pairs.get(k) ?? 0) + 1); });
    ok([...pairs.values()].every((v) => v === legs), `rr each pair ${legs}x n=${n}`);
    const byRound = new Map<number, string[]>();
    m.forEach((p) => byRound.set(p.round, [...(byRound.get(p.round) ?? []), p.a, p.b]));
    ok([...byRound.values()].every((ts) => new Set(ts).size === ts.length), `rr no double-booking in a round n=${n}`);
  }
}
ok(JSON.stringify(seedOrder(8)) === "[1,8,4,5,2,7,3,6]", "seedOrder 8");
for (const n of [3, 4, 5, 6, 7, 8, 12]) {
  const t = Array.from({ length: n }, (_, i) => "T" + i);
  const { nodes, rounds } = knockoutTree(t);
  const real = nodes.filter((x) => !x.bye);
  ok(real.length === n - 1, `ko matches n=${n}: ${real.length}`);
  ok(nodes.filter((x) => x.stage === "final").length === 1, `ko one final n=${n}`);
  const r1 = nodes.filter((x) => x.round === 1 && !x.bye).flatMap((x) => [x.a, x.b]);
  const direct = nodes.filter((x) => x.round > 1).flatMap((x) => [x.a, x.b]).filter(Boolean);
  ok(new Set([...r1, ...direct]).size === n, `ko every team placed once n=${n}`);
}
const s = scheduleSlots(5, "2026-12-01", 2, ["10:00", "14:00"]);
ok(s[0] === "2026-12-01T10:00:00+05:30" && s[3] === "2026-12-02T14:00:00+05:30", "schedule slots");
console.log(fail === 0 ? "ALL FIXTURE TESTS PASSED" : fail + " FAILED");
