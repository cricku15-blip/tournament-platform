# HANDOFF.md

## Backend requests (schema changes needed by other plans)
_none yet_

## Plan status
| Plan | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| 1 Supabase backend | Claude | plan-1-supabase-backend | DB done, rest in progress | Migrations 0001-0015 applied to Supabase project `rljkmcncpsqigwmdbykb`. `types/supabase.ts` generated. Edge Functions written, NOT deployed (need Razorpay + Resend keys). pg_cron not yet enabled. |
| 2 Web foundation | Antigravity | plan-2-web-foundation | Ready to start | Branch already contains Plan 1 types. Env vars are in `.env` (ask the owner; never commit). Use `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. |
