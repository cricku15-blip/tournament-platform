#!/usr/bin/env node
// RLS default-deny check (Plan 10). Logs in as user A and tries to read and write user B's private rows.
// Usage (staging!):
//   SUPABASE_URL=... ANON_KEY=... USER_A_TOKEN=<access token A> USER_B_TOKEN=<access token B> node scripts/rls-check.mjs
// Exit code 1 if anything leaks. Tokens are access tokens of two ordinary (non-admin) users who each own some data.

const { SUPABASE_URL, ANON_KEY, USER_A_TOKEN, USER_B_TOKEN } = process.env;
if (!SUPABASE_URL || !ANON_KEY || !USER_A_TOKEN || !USER_B_TOKEN) {
  console.error("Set SUPABASE_URL, ANON_KEY, USER_A_TOKEN and USER_B_TOKEN.");
  process.exit(2);
}
const sub = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub;
const A = sub(USER_A_TOKEN);
const B = sub(USER_B_TOKEN);
let failures = 0;
const fail = (m) => { failures++; console.error("LEAK:", m); };
const ok = (m) => console.log("ok:  ", m);

async function call(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token ?? ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// table -> column that points at the owner
const PRIVATE = {
  notifications: "user_id", notification_settings: "user_id", subscriptions: "user_id", subscription_payments: "user_id",
  tournament_payments: "organizer_id", refunds: "requested_by", player_applications: "user_id", player_sport_profiles: null,
};
// tables nobody but admins/service role may read at all
const ADMIN_ONLY = ["webhook_events", "audit_log", "contact_messages", "city_requests", "reports"];

for (const [table, col] of Object.entries(PRIVATE)) {
  if (!col) continue;
  const r = await call(`${table}?${col}=eq.${B}&select=*&limit=5`, { token: USER_A_TOKEN });
  if (r.status === 200 && Array.isArray(r.json) && r.json.length > 0) fail(`${table}: user A can read ${r.json.length} of B's rows`);
  else ok(`${table}: A cannot read B's rows`);
  const w = await call(`${table}?${col}=eq.${B}`, { token: USER_A_TOKEN, method: "DELETE" });
  if (w.status === 200 && Array.isArray(w.json) && w.json.length > 0) fail(`${table}: user A deleted B's rows`);
  else ok(`${table}: A cannot delete B's rows`);
  const u = await call(`${table}?${col}=eq.${B}`, { token: USER_A_TOKEN, method: "PATCH", body: {} });
  if (u.status === 200 && Array.isArray(u.json) && u.json.length > 0) fail(`${table}: user A updated B's rows`);
  else ok(`${table}: A cannot update B's rows`);
}

for (const table of ADMIN_ONLY) {
  for (const [who, token] of [["anon", undefined], ["user A", USER_A_TOKEN]]) {
    const r = await call(`${table}?select=*&limit=1`, { token });
    if (r.status === 200 && Array.isArray(r.json) && r.json.length > 0) {
      // reports/city_requests may be insertable but never readable by others
      fail(`${table}: ${who} can read rows`);
    } else ok(`${table}: ${who} cannot read`);
  }
}

// Profiles: A must not read B's private columns, and the public view must not expose phone or date of birth.
const prof = await call(`profiles?id=eq.${B}&select=phone,date_of_birth,is_admin`, { token: USER_A_TOKEN });
if (prof.status === 200 && Array.isArray(prof.json) && prof.json.length > 0) fail("profiles: user A can read B's private profile columns");
else ok("profiles: A cannot read B's private columns");
const view = await call("public_profiles?select=*&limit=1");
if (view.json?.[0] && ("phone" in view.json[0] || "date_of_birth" in view.json[0])) fail("public_profiles exposes phone or date_of_birth");
else ok("public_profiles hides phone and date of birth");

// Self-escalation attempts: neither should change anything.
const adm = await call(`profiles?id=eq.${A}`, { token: USER_A_TOKEN, method: "PATCH", body: { is_admin: true, status: "active" } });
const me = await call(`profiles?id=eq.${A}&select=is_admin`, { token: USER_A_TOKEN });
if (me.json?.[0]?.is_admin === true) fail("user A made themselves admin");
else ok(`profiles: self-promotion to admin is ignored (HTTP ${adm.status})`);

// Writes with no policy at all
for (const [table, body] of [["tournament_payments", { tournament_id: A, organizer_id: A, amount_paise: 1, total_paise: 1, tier_id: A }], ["audit_log", { action: "x" }], ["webhook_events", { provider: "x", event_id: "x" }]]) {
  const r = await call(table, { token: USER_A_TOKEN, method: "POST", body });
  if (r.status === 201) fail(`${table}: a normal user can insert rows`);
  else ok(`${table}: insert refused (HTTP ${r.status})`);
}

console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} problem(s) found.`);
process.exit(failures === 0 ? 0 : 1);
