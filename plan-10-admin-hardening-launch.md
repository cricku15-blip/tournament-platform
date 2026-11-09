# Plan 10: Admin panel, hardening, and launch

**Goal:** the owner can run the platform day to day, the system is proven for 10,000 to 15,000 users, and launch is a checklist, not a leap.

**Depends on:** Plans 1 to 9. **Read first:** `RULES.md` (all sections); spec sections 21, 24, 25, 28.

**Pages (14 of 59):** I1 `/admin`, I2 `/admin/users`, I3 `/admin/users/[id]`, I4 `/admin/tournaments`, I5 `/admin/tournaments/[id]`, I6 `/admin/payments`, I7 `/admin/subscriptions`, I8 `/admin/refunds`, I9 `/admin/reports`, I10 `/admin/cities`, I11 `/admin/sports`, I12 `/admin/pricing`, I13 `/admin/audit-log`, I14 `/admin/settings`.

## Part A: Admin panel (14 pages)

**Global admin rules:** pages are server-rendered, accessible only to `is_admin` (middleware **and** RLS); denser style (14 px tables, dark sidebar, "Admin" badge); every data-changing action asks for a **reason** and writes `audit_log` (through a server action that inserts using the admin client with the acting user's id, or an `_audit`-based RPC you add as a new migration); all lists are paginated (keyset) with search and filters.

- [ ] **I1 Dashboard:** tiles (new users today/7 d, active tournaments, live auctions now, organizer payments this month, active subscriptions, failed payments 7 d, open reports, pending refunds), charts (sign-ups/day line, tournaments by sport and city, subscription status split), attention list (open reports, refund requests, failed webhooks). Use a database view or RPC returning all tiles in one query; cache 60 s.
- [ ] **I2 Users:** table with search by name/email/phone/username, filters (city, role, status). **I3 User detail:** profile, relationships (organized, managed, played), subscription and payments, reports, audit trail; actions **Suspend** (with end date), **Ban**, **Restore**, **Change city**, **Send email**; every action needs a reason. Suspended/banned users are blocked by middleware and by RLS (`profiles.status`). Impersonation is **[OPEN]**, skip unless decided.
- [ ] **I4/I5 Tournaments:** filters (status, sport, city, payment status); **Hide** (set `visibility = 'unlisted'` and flag), **Cancel**, **Restore**; detail view with unlock-field, reassign organizer, force status (through a service-side function that sets `app.bypass_guard`), chat view, payment view, internal notes (add `admin_notes` via a new migration if needed).
- [ ] **I6 Payments:** organizer fee payments with Razorpay IDs (copy button, link to Razorpay dashboard), webhook event history drawer, CSV export, **Mark for refund** (creates a `refunds` row). **I7 Subscriptions:** filters, **Cancel subscription** (support), **Grant free period** (extend `current_period_end` with a reason).
- [ ] **I8 Refunds:** queue with reason, linked payment, eligibility vs Refund policy, **Approve** / **Reject** through the `process-refund` Edge Function (final `processed` status arrives via webhook), notifications to the user.
- [ ] **I9 Reports:** queue with content snapshot, reporter, count, status; actions delete content, mute/suspend user, hide tournament, dismiss, internal note.
- [ ] **I10 Cities:** add/edit/activate; **City requests** tab with one-click add. **I11 Sports:** structured editor for `config` (squad limits, roles, formats, points, tiebreakers) plus an "Advanced JSON" tab with validation and a **preview** of the generated forms.
- [ ] **I12 Pricing:** tiers table (name, min/max teams, amount, active, sort) with overlap/gap validation (the database exclusion constraint is the backstop); player plan editor. **Changing a price creates a new version row and deactivates the old one**; for the player plan set `razorpay_plan_id = null` on the new row so `create-subscription` creates the Razorpay plan. Confirm dialog: "This applies to new purchases only." Grace days setting. Tax settings (`site_settings.tax`) **[OPEN: accountant input]**.
- [ ] **I13 Audit log:** immutable list with filters and before/after JSON diff view. **I14 Settings:** FAQ editor, legal page texts with versioning, contact email, announcement banner (text, color, dates), **maintenance mode** toggle, feature flags (live auction, chat, open team applications), email template previews.
- [ ] Playwright: admin can suspend a user (user is then blocked), edit a tier price (pricing page updates within 5 min), process a test refund.

## Part B: Load, security, and resilience (all required before launch)

- [ ] **Seed script** creating realistic volume: 15,000 profiles, 3,000 tournaments (300 live), 20,000 applications, 50,000 chat messages, 500,000 audit/notification rows. Run it on a staging project sized like production.
- [ ] **Query review:** run `pg_stat_statements` (Dashboard > Database > Query Performance) after the load tests; fix anything over 100 ms p95 or sequential-scanning a big table; record findings in `docs/perf.md`.
- [ ] **k6 load tests** in `loadtest/`: (1) 1,000 VUs browsing `/`, `/tournaments`, tournament tabs for 10 min; (2) 200 simultaneous logins; (3) auction: 300 spectators + 16 bidders, a bid storm where all bidders bid within the same second for 50 lots, asserting exactly one accepted bid per step and bid-to-screen under 1 s; (4) replay 500 webhook events including duplicates; (5) chat: 100 users posting at 1 message per 5 s. Pass criteria are in `RULES.md` section 0 and 8.
- [ ] **Realtime capacity:** confirm the current plan's connection and message limits cover 1,500 connections at peak; upgrade the plan if not.
- [ ] **Security review checklist:** RLS default-deny verified by an automated test that logs in as user A and tries every table as user B; no service key in bundles; CSP and headers; rate limits on every listed endpoint; file upload type/size checks; webhook signature and idempotency; admin actions audited; dependency audit (`npm audit`, pin Edge Function imports); secrets rotated and stored only in env.
- [ ] **Abuse tests:** attempt city bypass, subscription bypass, direct status updates, bid manipulation, other-team squad edits, reading phone numbers; each must fail.
- [ ] **Resilience drills:** kill the realtime connection mid-auction; delay a webhook by 10 minutes; take the database offline briefly (maintenance page); restore a backup into a scratch project and verify (`docs/restore-drill.md`).
- [ ] **Accessibility audit:** axe + manual keyboard and screen reader pass on 10 key flows; fix all serious issues.
- [ ] **Performance audit:** Lighthouse on the 8 most visited pages; bundle analysis against budgets; fix regressions.
- [ ] **Monitoring and alerts:** error tracker alerts, uptime check on `/` and `/api/health`, alerts on webhook error count, failed payment spike, DB CPU/connection use, storage growth. Write `docs/runbook.md` (what to do for: webhook failing, payment stuck, auction crash, bad deploy rollback).

## Part C: Launch checklist

- [ ] **Accounts and plans:** Supabase production project on a plan with daily backups and enough connections; custom SMTP; domain and DNS; Vercel (or hosting) production with environment variables; **check that your hosting plan's terms allow commercial use**.
- [ ] **Razorpay:** KYC complete, live keys in **production** env only, webhook pointing to the production function with the live secret, Subscriptions and UPI AutoPay enabled, one real small test payment and refund performed by the owner.
- [ ] **Prices and tax:** replace the placeholder tiers and plan in Admin > Pricing; confirm tax settings with your accountant; GST/invoice details on receipts.
- [ ] **Legal:** final Terms, Privacy, Refund policy pages (reviewed), age rules decided (spec 28.3), the "money is outside the platform" statement visible in Terms, apply flows, and FAQ.
- [ ] **Content:** cities active, FAQ filled, about page, contact email, announcement banner ready.
- [ ] **First city plan:** create 2 to 3 demo tournaments with real organizers; invite managers; seed the first player cohort (free subscription period via Admin > Subscriptions "Grant free period").
- [ ] **Go/no-go meeting:** all Plan 1 to 10 acceptance boxes ticked; load tests passed; backups restored; owner has run the full flow (organizer, manager, player) in production with test data, then cleaned it up.
- [ ] **Day-one watch:** dashboards open (errors, payments, DB load); first week daily review of reports, refunds, and webhook errors.

## Acceptance criteria
- [ ] All 14 admin pages work with the permissions above; a non-admin gets 404/403 on every admin route and API.
- [ ] Load test thresholds met on the staging project; findings fixed; `docs/perf.md` committed.
- [ ] Restore drill completed and documented.
- [ ] Launch checklist fully ticked and signed off by the owner.

**After launch:** phone OTP login, Hindi, web push, PDF invoices, assistant manager, group-stage formats, live scoring (see spec 28).
