# MY-TASKS.md: things only the owner can do

Claude updates this file whenever a new manual step appears. Tick a box when done and tell Claude.
Never put passwords or keys in chat or in git. Secrets go only in `.env` (gitignored).

## Now (blocking Plan 1)
- [ ] **Enable pg_cron:** Supabase dashboard > Database > Extensions > `pg_cron` > enable. Then tell Claude (Claude schedules the cleanup job).
- [ ] **Auth URLs (C1):** Authentication > URL Configuration. Site URL `http://localhost:3000`. Redirect URL `http://localhost:3000/auth/callback`.
- [ ] **Razorpay (test mode, no KYC):** create account, Settings > API Keys > generate test keys. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` in `.env`.
- [ ] **Razorpay webhook secret:** invent a long random string, put it in `.env` as `RAZORPAY_WEBHOOK_SECRET`. Claude will give the webhook URL after functions are deployed; you paste it in Razorpay dashboard > Webhooks.
- [ ] **Resend:** create account, API key into `.env` as `RESEND_API_KEY`. Add `EMAIL_FROM` (can be `onboarding@resend.dev` for testing).
- [ ] **Add Claude permission rules** (so Claude stops being blocked): allow `Bash(supabase functions deploy:*)`, `Bash(supabase secrets set:*)`, `Bash(supabase db push:*)`.

## Soon
- [ ] Give Antigravity its start prompt (see WORK-SPLIT.md) on branch `plan-2-web-foundation`.
- [ ] Answer the 15 open decisions in spec section 28 (Hindi? age rules? grace period? tax?). Needed before Plans 3, 6, 7.
- [ ] Sign up once in the app, then tell Claude your email to run `scripts/make-admin.sql` (C8).
- [ ] Google login (C2): Google Cloud Console > OAuth client, redirect `https://rljkmcncpsqigwmdbykb.supabase.co/auth/v1/callback`; paste Client ID and Secret in Supabase > Auth > Providers > Google. Can wait; email OTP works first.

## Before launch
- [ ] Rotate Supabase service_role key and access token (they were shown in a screenshot).
- [ ] Create a separate `prod` Supabase project (current one is the only one and is labelled production).
- [ ] Custom SMTP (C3), paid plan with backups (C10), edit placeholder prices in migration 0014.
- [ ] Buy domain, Vercel account, Razorpay live keys and KYC.
