# MY-TASKS.md: things only the owner can do

Claude updates this file whenever a new manual step appears. Tick a box when done and tell Claude.
Never put passwords or keys in chat or in git. Secrets go only in `.env` (gitignored).

## Now (blocking Plan 1)
- [x] pg_cron enabled and cleanup job scheduled (done by Claude).
- [x] Auth Site URL and redirect URL set (done by Claude).
- [ ] **Razorpay (test mode, no KYC):** create account, Settings > API Keys > generate test keys. Fill `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` in `.env` (empty lines already added).
- [ ] **Razorpay webhook secret:** invent a long random string, put it in `.env` as `RAZORPAY_WEBHOOK_SECRET`. Claude will give the webhook URL after functions are deployed; you paste it in Razorpay dashboard > Webhooks.
- [ ] **Resend:** create account, API key into `.env` as `RESEND_API_KEY`. Add `EMAIL_FROM` (can be `onboarding@resend.dev` for testing).
- [x] Claude permission rules added.
- [x] All 8 Edge Functions deployed (they will fail until the Razorpay/Resend keys are set; tell Claude after filling `.env` and it runs `supabase secrets set`).
- [ ] Razorpay webhook URL to paste in Razorpay dashboard > Webhooks: `https://rljkmcncpsqigwmdbykb.supabase.co/functions/v1/razorpay-webhook` (events: payment.captured, order.paid, subscription.*, refund.*).

## Soon
- [ ] **Apply migration 0018** (assistant organizers, ownership transfer, group stage format, football quarter-finals, public view columns) with `supabase db push`, then `npm run db:types`. Until then the Settings tab access section, groups format and "view as" will error. Also redeploy the `generate-fixtures` Edge Function (`supabase functions deploy generate-fixtures`).
- [ ] **Apply migration 0017** (admin support: suspension end dates, tournament notes, dashboard RPC) with `supabase db push`, then tell Claude to regenerate types. Until then the admin dashboard tiles are blank.
- [ ] Create a **staging** Supabase project and run `scripts/seed-staging.sql`, then the k6 tests in `loadtest/` (Claude can help read the results).
- [ ] **Apply migration 0016** (simple-mode auction sales and reminder flags): `supabase db push`, then tell Claude to regenerate `types/supabase.ts`. Needed before simple-mode auctions or `send-reminders` work.
- [ ] **Schedule `send-reminders`** every 15 minutes and set the `SITE_URL` secret (see HANDOFF Plan 9).
- [ ] Give Antigravity its start prompt (see WORK-SPLIT.md) on branch `plan-2-web-foundation`.
- [ ] Answer the 15 open decisions in spec section 28 (Hindi? age rules? grace period? tax?). Needed before Plans 3, 6, 7.
- [ ] Sign up once in the app, then tell Claude your email to run `scripts/make-admin.sql` (C8).
- [ ] Google login (C2): Google Cloud Console > OAuth client, redirect `https://rljkmcncpsqigwmdbykb.supabase.co/auth/v1/callback`; paste Client ID and Secret in Supabase > Auth > Providers > Google. Can wait; email OTP works first.

## Before launch
- [ ] Rotate Supabase service_role key and access token (they were shown in a screenshot).
- [ ] Create a separate `prod` Supabase project (current one is the only one and is labelled production).
- [ ] Custom SMTP (C3), paid plan with backups (C10), edit placeholder prices in migration 0014.
- [ ] Buy domain, Vercel account, Razorpay live keys and KYC.

---

## TOMORROW (added 2026-11-10)

### A. Google login (button hidden until flag is on)
- [ ] Google Cloud: project `intense-music-514317-n3` > OAuth > Get started (App name GroundWar, External, your email).
- [ ] Clients > Create client > Web application.
  - JS origins: `https://tournament-platform-omega.vercel.app`, `http://localhost:3000`
  - Redirect URI: `https://rljkmcncpsqigwmdbykb.supabase.co/auth/v1/callback`
- [ ] Audience > Test users > add your Gmail (while in Testing mode).
- [ ] Supabase > Authentication > Providers > Google: enable, paste Client ID + Secret (secret never goes in chat/repo/.env).
- [ ] Supabase > Authentication > URL Configuration: Site URL = the vercel URL; Redirect URLs = `<vercel url>/**` and `http://localhost:3000/**`.
- [ ] Vercel env: `NEXT_PUBLIC_GOOGLE_AUTH=true`, check `NEXT_PUBLIC_APP_URL`, then Redeploy.
- [ ] Test `/login` > Continue with Google. Before launch: OAuth consent > Publish app.

### B. Razorpay LIVE test with Rs 1 (owner overrode the "no live money" rule)
State right now: Supabase secrets set (live key id/secret/webhook secret). Razorpay webhook added and Enabled. Vercel env vars added.
- [ ] Confirm latest Vercel deployment is Ready (not blocked).
- [ ] Buy a tournament (Rs 1 + 18% tax) and the player plan. Check payment row = paid, subscription active, webhook_events has the events.
- [ ] Replay one webhook from Razorpay dashboard: no double entry.
- [ ] Refund from dashboard, check `refund.processed`.
- [ ] Tell Claude: "test done" so prices get restored.

### C. PRICES ARE TEMPORARILY Rs 1 IN PRODUCTION DB (restore after test!)
- `pricing_tiers`: 3 to 4 teams = 50000, 5 to 6 teams = 100000, 7 to 8 teams = 150000 (paise)
- `player_plans`: Player monthly = 9900 paise, and set `razorpay_plan_id = null` (the Razorpay plan is created on first subscribe at Rs 1 and its amount is fixed there)
- Command: `supabase db query --linked --yes "<sql>"` (needs --yes in agent mode)

### D. Other
- [ ] Rotate `SUPABASE_ACCESS_TOKEN` and DB password (prefixes were printed in a terminal during a status check).
- [ ] `RESEND_API_KEY` still empty (emails/receipts).
- [ ] Repo is PUBLIC right now only so Vercel Hobby would deploy. After a successful deploy, make it private again. On private + Hobby, commits with a Co-Authored-By trailer get blocked.
- [ ] Plan 10 load tests still to run before public launch.
