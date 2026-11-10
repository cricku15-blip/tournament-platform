# Load tests (k6)

Run these against **staging** (never production) after `scripts/seed-staging.sql`. Install k6 from https://k6.io.
Pass criteria come from RULES.md sections 0 and 8.

| Script | What it proves | Command |
|---|---|---|
| `browse.js` | 1,000 virtual users browsing `/`, `/tournaments`, tournament tabs for 10 minutes. p95 server time under 300 ms for cached public pages, error rate under 1% | `k6 run -e BASE_URL=https://staging.example.com loadtest/browse.js` |
| `logins.js` | 200 simultaneous logins by password (test users) | `k6 run -e SUPABASE_URL=... -e ANON_KEY=... -e PASSWORD=... loadtest/logins.js` |
| `auction.js` | 300 spectators plus 16 bidders. A bid storm on 50 lots: exactly one accepted bid per step, bid to screen under 1 s | `k6 run -e SUPABASE_URL=... -e ANON_KEY=... -e TOURNAMENT_ID=... -e BIDDER_TOKENS=tok1,tok2,... loadtest/auction.js` |
| `webhooks.js` | 500 signed webhook events including duplicates: no duplicate payments | `k6 run -e FUNCTION_URL=... -e WEBHOOK_SECRET=... loadtest/webhooks.js` |
| `chat.js` | 100 users posting 1 message every 5 s (the database enforces 3 s slow mode) | `k6 run -e SUPABASE_URL=... -e ANON_KEY=... -e TOURNAMENT_ID=... -e TOKENS=tok1,... loadtest/chat.js` |

Bidder and user tokens: sign in the seed/test users with `scripts/` helpers or the Auth API and pass their access tokens. Do not commit tokens.

After each run open Supabase Dashboard > Database > Query Performance and record anything over 100 ms p95 in `docs/perf.md`.
