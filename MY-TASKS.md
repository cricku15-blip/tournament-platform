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
