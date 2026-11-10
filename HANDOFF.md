# HANDOFF.md

## Backend requests (schema changes needed by other plans)
_none yet_

## Plan status
| Plan | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| 1 Supabase backend | Claude | plan-1-supabase-backend | DB done, rest in progress | Migrations 0001-0015 applied to Supabase project `rljkmcncpsqigwmdbykb`. `types/supabase.ts` generated. Edge Functions written, NOT deployed (need Razorpay + Resend keys). pg_cron not yet enabled. |
| 2 Web foundation | Antigravity | plan-2-web-foundation | Complete | Tasks 2.1-2.7 complete. All unit tests (31/31), lint, typecheck, and Next.js build pass. Landing bundle 128.56 KB (budget: < 150 KB). Zero server secrets in client bundle. Ready for Plans 3 & 4. |

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
