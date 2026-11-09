# RULES.md: build for 10,000 to 15,000 users from day one

Copy this file to the repo root and to `CLAUDE.md` so Claude Code reads it at the start of every session. **Every plan (1 to 10) must follow these rules.** If a task would break a rule, stop and ask.

## 0. Scale targets (design assumptions, verify against your Supabase plan limits)

| Item | Target |
|---|---|
| Registered users | 15,000 |
| Daily active users | up to 4,000 |
| Peak concurrent web sessions | 1,500 |
| Largest single auction | 300 watchers, 16 bidding managers |
| Simultaneous live auctions | 5 (about 1,500 realtime connections at peak) |
| Tournaments in the database | 3,000 (live at once: up to 300) |
| Read latency (p95, cached public pages) | under 300 ms server time |
| Bid accepted to every screen updated | under 1 second |
| LCP on public pages, mid-range phone on 4G | under 2.5 s |

Supabase connection and Realtime limits depend on your plan and change over time. **Check the current limits in the dashboard before launch** and upgrade the plan to match the targets. Never assume the free tier will carry launch traffic.

## 1. Architecture rules

1. **Rules live in the database, not in the UI.** City match, subscription gate, purse and squad limits, status changes, who can edit what: all enforced by RLS and server functions from Plan 1. The UI only shows results and friendly messages.
2. **Never trust the browser for money.** Amounts come from `pricing_tiers` / `player_plans` on the server. A payment is "paid" only after the verified Razorpay webhook.
3. **Service role key is server-only.** It never appears in client bundles, logs, or `NEXT_PUBLIC_` variables. Use it only in route handlers, server actions, and Edge Functions.
4. **Migrations are append-only.** Never edit an applied migration; add the next number. Regenerate `types/supabase.ts` after each one.
5. **Everything that can run twice must be safe to run twice** (webhooks, retries, double clicks). Use unique keys and idempotent functions.
6. **Feature flags** (`site_settings.flags`) wrap live auction, chat, and open team applications so they can be switched off without a deploy.

## 2. Database and query rules

1. **Index every foreign key and every filter/sort column** used by a list. A new query without an `explain analyze` on realistic data is not done.
2. **No `select *` in lists.** Select only the columns shown. No `select *` from joins in server components.
3. **No N+1.** Fetch related rows with one query (joins, views, `in (...)`). Reading a list of 12 cards must be 1 to 2 queries, not 13.
4. **Keyset pagination for anything that can grow** (chat, notifications, audit log, applications, players): `where (created_at, id) < (:cursor_time, :cursor_id) order by created_at desc, id desc limit 30`. Offset pagination only for small admin tables. Default page size 12 to 30, hard maximum 100.
5. **Use the counters** (`approved_team_count`, `approved_player_count`) instead of `count(*)` on lists.
6. **RLS performance:** policies use `(select auth.uid())`; helper functions are `stable security definer`; every column used in a policy is indexed.
7. **Heavy aggregates** (leaderboards, career stats) are views first. If a view takes over 100 ms at scale, convert it to a materialized view refreshed inside `publish_match_result`, and add a unique index so it can refresh concurrently.
8. **Writes that must not race use one transaction with a row lock** (the auction lot). Never read-then-write from the client.
9. **Retention:** `webhook_events` 90 days, `chat_mutes` 7 days after expiry (both in `expire_stale_data`). Plan to archive `chat_messages` and `audit_log` older than 12 months; keep indexes on `created_at` so deletes are cheap.

## 3. Connections and server rules

1. The web app talks to Supabase through **supabase-js over HTTPS** (PostgREST, already pooled). Do **not** open raw Postgres connections from serverless functions. If a direct connection is ever required, use the pooler in transaction mode.
2. **Rate limit** every endpoint that sends email, accepts free text, or searches: login/email send, contact form, chat post (3 s per user, already in the database), player search, invites, bids. Pick one mechanism in Plan 2 (an Upstash Redis free tier or a Postgres counter table) and use it everywhere.
3. **No slow work in a request.** PDFs, emails, notifications to hundreds of members, and CSV exports run in Edge Functions or scheduled jobs. Request handlers return in well under a second.
4. **Validate every input twice:** Zod on the client for UX, Zod again in server actions/route handlers, and database constraints as the last line.
5. **Security headers:** strict CSP (allow Razorpay checkout and Supabase), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame-ancestors none (Razorpay popups are allowed via its script).

## 4. Frontend performance rules

1. **Server Components by default;** client components only for interactivity. Public pages use ISR with tag-based revalidation (`revalidateTag('tournament:<id>')` after publish, result, or registration changes).
2. **Never put per-user data in a cached page.** Fetch personalised bits (my role, my subscription, bid button state) on the client or in a separate dynamic segment.
3. **Bundle budget:** the landing page ships under 150 KB of JavaScript (gzipped); the app shell under 250 KB. Dynamic-import heavy parts (auction room, console, charts, rich text editor, Razorpay script, date pickers).
4. **Fonts:** `next/font`, only the weights used (Barlow Condensed 600/700, Figtree 400/500/600), `display: swap`.
5. **Images:** `next/image` with explicit sizes; resize in the browser before upload (max 1600 px wide, WebP at 0.85) so storage and bandwidth stay small; show a generated placeholder when missing.
6. **Lists over 100 rows are virtualised** (pool, applications, chat history). Tables become stacked cards on mobile.
7. **Stream with Suspense** so the header and layout paint before data arrives; skeletons match final layout to avoid layout shift.

## 5. Realtime rules (auction and chat)

1. **Auction updates use Broadcast** on one channel per tournament (`auction:<id>`). Do not subscribe 300 spectators to Postgres Changes for bids.
2. **Presence only for managers and the auctioneer,** never for spectators. Show the spectator count from a cheap periodic query.
3. **The database is the source of truth.** On connect, reconnect, and every 20 seconds as a safety net, re-read the lot, purses, and last 8 bids; apply broadcast events on top.
4. **Unsubscribe on unmount** and when the tab is hidden for over 60 seconds; resubscribe on focus.
5. **Throttle UI work:** batch bid-history rendering to one frame; never re-render the whole room on a single bid.
6. **Chat** uses Postgres Changes filtered by `tournament_id`, loads the last 30 messages, and pages older ones with keyset pagination.
7. Disable the bid button while a bid is in flight; show the server's rejection message; never fake a successful bid.

## 6. Reliability and operations

1. **Observability:** structured logs with a request ID, an error boundary on every route group, and an error tracker (choose in Plan 2). Alert on: webhook failures, payment `failed` spikes, auction function errors, 5xx rate.
2. **Backups:** daily backups on production and a tested restore (Plan 10). Keep the weekly `supabase db dump` until then.
3. **Maintenance mode** (`/maintenance`) can be switched on from Admin > Settings without a deploy.
4. **Zero-downtime migrations:** add columns as nullable or with defaults, backfill, then add constraints; never rename or drop a column in use. Create big indexes with `create index concurrently` outside a transaction in production.
5. **Dev, staging, prod** are separate Supabase projects and separate Razorpay modes (test vs live).

## 7. Code conventions

1. TypeScript strict; no `any` without a comment. Types come from `types/supabase.ts`.
2. Folder layout follows spec section 4.3. Domain components in `components/domain`, primitives in `components/ui`.
3. All RPC calls go through one typed wrapper (`lib/rpc.ts`) that maps error codes to user-friendly messages (`lib/errors.ts`). No string matching in components.
4. All user-visible text lives in the message catalogue (`next-intl`), even if English only at launch.
5. Money is integers in paise everywhere; format with one helper (`formatINR`, Indian digit grouping). Dates use one helper and show India time unless the user changes it.
6. Accessibility is part of "done": labels, focus order, contrast, 44 px targets, reduced motion, `aria-live` for the auction.
7. Components follow the design system in spec section 5 exactly (colors, type, radii). Amber is for **live** states only.

## 8. Testing rules (what "done" means)

For every page or feature: unit tests for logic, a Playwright test for the main flow, loading/empty/error states present, light and dark mode checked, three breakpoints checked, permissions tested (a user who should be blocked is blocked), and `npm run lint && npm run typecheck && npm test` green.

**Load tests (Plan 10) must pass before launch:** 1,000 virtual users browsing public pages; 300 spectators plus 16 bidders in one auction with a bid storm (all managers bidding within the same second, exactly one winner per bid step); 200 simultaneous logins; webhook replay of 500 events.

## 9. Working agreement for Claude Code

1. Read this file, the web spec (`tournament-platform-web-spec.md`), and the current plan before writing code.
2. Do the plan's tasks **in order**; tick each checkbox in the plan file when finished and note anything skipped.
3. Do not add features not in the plan or spec. Open decisions in spec section 28 must be asked, not guessed.
4. Prefer small, reviewable commits: one task, one commit.
5. If something in a plan contradicts this file, this file wins; tell the owner.
6. Never commit secrets. Never test live payments with real money before Plan 10's checklist.
