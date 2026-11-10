# HANDOFF.md

## Backend requests (schema changes needed by other plans)
_none yet_

## Plan status
| Plan | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| 1 Supabase backend | Claude | plan-1-supabase-backend | DB done, rest in progress | Migrations 0001-0015 applied to Supabase project `rljkmcncpsqigwmdbykb`. `types/supabase.ts` generated. Edge Functions written, NOT deployed (need Razorpay + Resend keys). pg_cron not yet enabled. |
| 2 Web foundation | Antigravity | plan-2-web-foundation | Complete | Tasks 2.1-2.7 complete. All unit tests (31/31), lint, typecheck, and Next.js build pass. Landing bundle 128.56 KB (budget: < 150 KB). Zero server secrets in client bundle. Ready for Plans 3 & 4. |
| 3 Auth/onboarding/account | Claude (took over from Antigravity) | plan-3-auth-onboarding-account | Complete (e2e needs real login to finish) | Pages C1-C5, D1, D2, D3, D5 + realtime bell. See below. |
| 4 Public site | Claude | plan-4-public-site | Complete (needs seed data to eyeball tournament pages) | A1-A10, B1-B4, B6 + SEO. See below. |

## Plan 2 Handoff Details
- **Branch:** `plan-2-web-foundation`
- **Done:**
  - **2.1 Scaffold:** Next.js App Router, TypeScript strict, Tailwind v4, dependencies, route groups `(public)`, `(auth)`, `(app)`, `(admin)`, environment validation in `lib/env.ts` and `lib/env.server.ts` with strict server-only boundaries.
  - **2.2 Supabase wiring:** `lib/supabase/` browser, server, admin clients; `middleware.ts` for session refresh, protected route guards, onboarding redirect, admin gate, and maintenance mode; `lib/rpc.ts` typed RPC caller; `lib/errors.ts` friendly error mapper; `lib/session.ts` request-cached role/profile helpers; role switcher cookie.
  - **2.3 Design tokens:** CSS variables for all color tokens in light & dark, Barlow Condensed & Figtree font loading with fallback, spacing/radii, reduced-motion rules, focus rings.
  - **2.4 Base components:** Full suite in `components/ui/` with states, Vitest tests, and `/dev/ui` catalog page.
  - **2.5 Layout shells:** `PublicHeader`, `AppHeader`, `Footer`, `WorkspaceSidebar`, `BottomBar`, `Breadcrumbs`, `CitySelector` (cookie & RPC), `RoleSwitcher`, `UserMenu`, `GlobalSearch`, `NotificationsBell`, and layouts for all 4 route groups.
  - **2.6 System pages:** `app/not-found.tsx` (J1), `app/error.tsx` (J2 with error ID), `app/global-error.tsx`, `app/maintenance/page.tsx` (J3) with custom line-drawn SVGs.
  - **2.7 Cross-cutting:** `next-intl` setup with `messages/en.json`, formatting helpers in `lib/format.ts` (`formatINR`, `formatDate`, etc.), `lib/rate-limit.ts` (Upstash Redis + in-memory fallback), security headers & CSP in `next.config.ts`, `lib/observability.ts`, privacy-first analytics helper (`lib/analytics.ts`), GitHub Actions CI (`.github/workflows/ci.yml`), bundle budget check (`scripts/check-bundle-budget.mjs`), and `README.md`.
- **Skipped:** None.
- **Env vars:**
  - Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
  - Server: `SUPABASE_SERVICE_ROLE_KEY` (mandatory on server)
  - Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
- **Open questions:**
  - Hindi language catalogue support (spec 28 open decision; `next-intl` is structured so adding `messages/hi.json` and locale switcher is straightforward).
  - External analytics and error tracking provider selection (Sentry/PostHog/custom).


## Owner decisions on spec section 28 (2026-11-10)
1. Language: English only. 2. No phone OTP/verification at all; phone optional and unverified. 3. Age: min 13, under 18 sees parental-consent note. 4. Subscription grace: 3 days. 5. Direct squad adds must match tournament city. 6. Team roster at application: not required. 7. Chat: new users cannot post links; chat closes 7 days after tournament ends. 11. Tax/GST: basic placeholder version for now. 13. One unsold round; unsold players can be added directly later. 14. Organizer public contact default OFF. 15. Only admin activates new cities.
**Owner wants these in v1 now (not later):** 8 assistant manager role, 9 tournament ownership transfer, 10 admin read-only impersonation, 12 group stage + knockout and football playoff styles. These need schema work (new migrations) and are NOT in plans 1-10 yet; schedule them as an extra plan after Plan 9.

## Plan 3 Handoff Details
- **Branch:** `plan-3-auth-onboarding-account` (by Claude; Antigravity's empty branch of the same name was deleted).
- **Done:** C1 /login, C2 /signup (Google + email link + 6-digit code, `?next=` safe-redirect), C3 /auth/check-email (6-box code, paste, 60s resend), C4 /auth/callback, C5 /onboarding (city + detect location via `lib/cities.ts` coords + "city not listed" -> `city_requests`; about you; intent + sport profiles; state survives refresh), D1 /dashboard (role-aware, Suspense per section), D2 /profile (preview, unsaved bar, `change_city` RPC), D3 /settings (notification prefs, theme, export JSON, delete account, logout all), D5 /notifications (Today/Earlier, All/Unread, keyset 30/page, mark all read) and realtime bell (INSERT subscription filtered by user_id).
- **Changed shared files:** `lib/rpc.ts` no longer imports the server client (it broke the build when used from a client component); server callers now pass their client. `components/layout/notifications-bell.tsx` now self-loads when given `userId`. App layout shows the real city name.
- **Rate limits:** email send per IP and per address, code verify per IP, username check, city request, data export.
- **Skipped / notes:**
  - Google login needs the Google provider configured in Supabase (MY-TASKS C2). Email link/code works first.
  - Email code relies on the Supabase "Confirm/Magic link" email template including `{{ .Token }}`; add it in Supabase > Auth > Email templates, otherwise only the link works.
  - Profile guard trigger silently reverts `is_admin` / `status` edits instead of raising an error (the database still refuses the change).
  - Delete account: organizer_id on `tournaments` has no ON DELETE rule, so users with any past tournament get "contact support". Needs a decision/migration (anonymise organizer) later.
  - Playwright auth tests are written (`e2e/auth.spec.ts`); full sign-up-to-dashboard e2e needs a test user/inbox (not available). Lighthouse 95+ not measured yet.
  - Invite code box routes to `/join/<code>`, which Plan 7 builds. Dashboard links to `/subscription`, `/tournaments`, `/player/applications`, `/organizer/*` pages that later plans build.
- **Env vars:** none new.


## Plan 4 Handoff Details
- **Branch:** `plan-4-public-site`.
- **Done:** landing (A1, ISR 5 min + client city strip), How it works, Pricing (live DB, shows "unavailable" on failure, no hard-coded numbers), About, Contact (honeypot + 5/hour/IP), FAQ (from `site_settings.faq`, default list if empty), Terms/Privacy/Refund (draft text, flagged "pending legal review"), City page, Browse `/tournaments` (GET filters in URL, 12/page), Tournament page with tab routes (overview, teams, fixtures, standings, stats, auction, chat, rules), Team, Match (cricket and football scorecards), Player profile (respects show_*), `sitemap.xml`, `robots.txt`, OG images for tournament/team/match, `SportsEvent` JSON-LD.
- **Data layer:** `lib/public/queries.ts` uses a cookie-less anon client + `unstable_cache` with tags `tournament:<id>`, `tournaments`, `tournament-slug:<slug>`, `player:<username>`. Later plans call `revalidateTournament()` from `lib/public/revalidate.ts` after publish, result, registration or announcement changes.
- **Per-viewer state** (`TournamentActions`) loads from `/api/tournaments/viewer` (no-store), so pages stay cacheable. It links to Plan 7 pages: `/tournaments/<slug>/apply-player`, `/apply-team`, and to `/subscription` (Plan 6).
- **Deviations / notes:**
  - Browse uses offset paging (max page 500, 12/page) instead of keyset, because "live first, then soonest start" can't be expressed as a simple keyset. Revisit if the table grows past a few thousand rows.
  - Shared fixes: `CitySelector` now gets real cities (it was using fake `city_raipur` ids that break the `change_city` RPC); middleware protected-route check no longer matches `/players/...`; root layout sets `metadataBase`.
  - Terms/Privacy/Refund text is placeholder pending legal review. Terms state that the platform is not part of user money exchange and that auction points are virtual.
  - Auction and Chat tabs are placeholders until Plan 9. Tournament "stats" minimums: strike rate 30 balls, economy 36 balls.
  - Tables and leaderboards only show data for published tournaments; DB currently has no tournaments, so tournament, team and match pages were only verified for 404 behaviour and compile, not visually.
  - Not measured: Lighthouse scores, 200-tournament seed timing, WhatsApp card preview, Playwright browse flow (tests skipped on owner's instruction).
- **Env vars:** `NEXT_PUBLIC_APP_URL` should be set in production (used for canonical, sitemap, OG, JSON-LD).


## Plan 5 PROGRESS NOTE (paused 2026-11-10, branch `plan-5-organizer-workspace`, NOT merged, NOT pushed)
**Done (committed or in the WIP commit):**
- `lib/organizer/`: `schemas.ts` (Zod for all wizard steps, sport rules, auction slabs), `match-count.ts`, `datetime.ts`, `guard.ts` (`requireOwnedTournament`, 404 for non-owners). 10 unit tests pass.
- `app/(app)/organizer/actions.ts`: saveDraft (per step), saveAuctionSettings, checkSlug (service role, returns boolean only), duplicate, deleteDraft, changeStatus (publish/close/reopen/lockPool/lockSquads/goLive/complete), cancelTournament, postAnnouncement, addTeamSlot, inviteManager, reviewTeam, removeTeam, setTeamEntry, reviewApplication, updatePoolPlayers, setSequenceMode. All call `revalidateTournament`.
- Pages: H1 `/organizer`, H2 `/organizer/tournaments` (tabs, keyset, Duplicate/Share/Delete draft), H3 `/organizer/tournaments/new` (7-step wizard, autosave 10 s, slug check, resume with `?draft=<id>`).
- Manager components written: `manager/next-step.tsx`, `manager/teams-tab.tsx`, `manager/applications-table.tsx`.
**Still to do for Plan 5:**
1. `app/(app)/organizer/tournaments/[id]/page.tsx` (H4): header + status stepper + `?tab=` routing; call `requireOwnedTournament`.
2. Tab server components: Overview (NextStepCard + activity feed), Setup (wizard `mode="setup"`, locks all four fields when status != draft), Teams (query teams + manager names, render TeamsTab), Applications (filters status/role/experience/search, counters, keyset 30, build `ApplicationRow` incl. past stats, render ApplicationsTable), Pool/Players (auction: edit category/base price, sequence, Lock pool via changeStatus; direct: read-only squads), Announcements, Plan and payment (tier, fee, invoice link; Upgrade wired in Plan 6), Settings (cancel with reason dialog, delete draft), placeholder tabs Auction/Fixtures/Results/Chat.
3. `loading.tsx`/error states, tick `plan-5-organizer-workspace.md`, lint, build, HANDOFF entry, push, merge to `main`.
**Notes:** wizard "Continue to payment" goes to `/organizer/tournaments/[id]/checkout` (Plan 6). Invite links use `/join/<code>` (Plan 7). No tests run against the real DB yet. Playwright tests skipped per owner. A stray `next start` on ports 3100/3101 may still be running; stop it manually if the ports are needed.
**Next after Plan 5:** Plan 6 (payments), 7 (teams/players/squads), 8, 9, then the extra plan for assistant manager / ownership transfer / impersonation / group stage, then Plan 10.
