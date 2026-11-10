# Launch checklist

Tick in this order. Items marked (owner) cannot be done by the code.

## A. Before staging tests
- [ ] Apply migrations 0016 and 0017 to staging, then production when ready (`supabase db push`), and run `npm run db:types`.
- [ ] Deploy all Edge Functions (`scripts/deploy-functions.sh`), set `SITE_URL`, schedule `send-reminders` every 15 minutes.
- [ ] Create a staging Supabase project sized like production. Seed with `scripts/seed-staging.sql`.

## B. Proof (Plan 10 Part B)
- [ ] `loadtest/` scripts pass (see `loadtest/README.md`) and `docs/perf.md` is filled in.
- [ ] `node scripts/rls-check.mjs` passes on staging (two normal users' tokens).
- [ ] `scripts/abuse-tests.sql`: every block fails as expected.
- [ ] `docs/restore-drill.md` completed.
- [ ] Realtime capacity: Dashboard > Settings > Realtime shows the plan's concurrent connection and message limits. The target is 1,500 connections at peak (5 auctions x 300 watchers). Upgrade the plan if the limit is lower, and test with `loadtest/auction.js`.
- [ ] Accessibility: run axe (browser extension or `@axe-core/playwright`) plus a keyboard and screen reader pass on these 10 flows: login, onboarding, browse, tournament page, apply as player, checkout, organizer wizard, result entry, live auction room, admin refund. Fix every serious issue.
- [ ] Performance: Lighthouse (mobile) on `/`, `/tournaments`, a tournament page and its Standings tab, a team page, a match page, `/pricing`, `/login`. LCP under 2.5 s. `npm run check:budget` passes.
- [ ] Security: `npm audit` (0 vulnerabilities at last run), no `NEXT_PUBLIC_` secret, service role key only in server env, Edge Function imports pinned, secrets rotated (MY-TASKS: rotate the service_role key and access token that were shown in a screenshot).
- [ ] Monitoring and alerts configured (error tracker, uptime check on `/` and `/api/health`, webhook errors, failed payment spike, DB CPU and connections, storage growth) and `docs/runbook.md` read by everyone on call.

## C. Accounts and plans (owner)
- [ ] Supabase production project on a plan with daily backups (or PITR) and enough connections; custom SMTP; separate from dev and staging.
- [ ] Domain and DNS; hosting (Vercel) production environment variables; confirm the hosting plan's terms allow commercial use.
- [ ] Razorpay: KYC complete; live keys only in the production environment; webhook pointing at the production function with the live secret; Subscriptions and UPI AutoPay enabled; one real small payment and refund done by the owner.
- [ ] Prices: replace the placeholder tiers and plan in Admin > Pricing; confirm tax with your accountant (Admin > Pricing > Tax); invoice details on receipts.
- [ ] Legal: final Terms, Privacy and Refund policy reviewed by a lawyer; age rules confirmed; "money is outside the platform" visible in Terms, apply flows and FAQ; update the legal version in Admin > Settings.
- [ ] Content: cities active, FAQ filled in (Admin > Settings), About page, contact email, announcement banner ready.
- [ ] First city: 2 to 3 demo tournaments with real organizers; invite managers; seed the first player cohort with Admin > Subscriptions > Grant free period.
- [ ] Make yourself admin in production (`scripts/make-admin.sql`).

## D. Go / no-go
- [ ] Every acceptance box in plans 1 to 10 is ticked or has a written reason it isn't.
- [ ] Owner has run the full flow (organizer, manager, player) in production with test data, then cleaned it up.
- [ ] Go / no-go meeting held. Decision and date recorded here: ________

## E. Day one and week one
- [ ] Dashboards open: error tracker, Razorpay payments, Supabase reports, Admin dashboard.
- [ ] Daily for the first week: Admin > Reports, Admin > Refunds, webhook errors tile, failed payments tile.
