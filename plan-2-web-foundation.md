# Plan 2: Web foundation and design system

**Pages (3 of 59):** J1 not found, J2 error, J3 maintenance.

**Goal:** a running Next.js app with the design system, layout shells, Supabase wiring, error handling, and test setup, so Plans 3 to 10 only add pages and features.

**Depends on:** Plan 1 (types, env, functions). **Read first:** `RULES.md`; spec sections 4, 5, 6, 7 (route list), 25.1, 26.

## Tasks

### 2.1 Scaffold
- [ ] `npx create-next-app@latest` (App Router, TypeScript strict, Tailwind, ESLint, `src` not used, import alias `@/`).
- [ ] Add dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `next-intl`, `lucide-react`, `clsx`, `@radix-ui/react-dialog`, `-tabs`, `-dropdown-menu`, `-popover`, `-select`, `-toast`, `-accordion`, `-tooltip`, `date-fns`, `date-fns-tz`.
- [ ] Dev dependencies: `vitest`, `@testing-library/react`, `@playwright/test`, `prettier`, `husky`, `lint-staged`.
- [ ] Create the folder structure from spec 4.3 with empty route groups: `(public)`, `(auth)`, `(app)`, `(admin)`.
- [ ] `lib/env.ts`: validate all env vars with Zod at startup; fail loudly if a server secret is missing; make it impossible to import server env in client code.

### 2.2 Supabase wiring
- [ ] `lib/supabase/browser.ts`, `lib/supabase/server.ts` (cookie-based via `@supabase/ssr`), `lib/supabase/admin.ts` (**server-only**, marked with `import "server-only"`).
- [ ] `middleware.ts`: refresh the session; redirect logged-out users from `(app)`/`(admin)` routes to `/login?next=...`; redirect logged-in users away from `/login` and `/signup`; send users with no `onboarded_at` to `/onboarding`; block `/admin` unless `profiles.is_admin`; read `site_settings.maintenance` (cached 30 s) and rewrite to `/maintenance` for non-admins.
- [ ] `lib/rpc.ts`: typed wrapper `rpc(name, args)` returning `{ data, error: { code, message } }`, where `code` is the exception message from Plan 1 Part F.
- [ ] `lib/errors.ts`: map every code in Plan 1's error table to a friendly sentence (catalogue keys), with a safe fallback "Something went wrong. Try again."
- [ ] `lib/session.ts`: `getSession()`, `getProfile()`, and `getUserRoles()`, which returns `{ player: true, organizer: boolean, manager: boolean, admin: boolean }` derived from data (tournaments owned, teams managed). Cache per request.
- [ ] Role switcher state stored in a cookie (`active_role`); falls back to the first available role.

### 2.3 Design tokens and base styles (spec section 5)
- [ ] CSS variables for all color tokens in light and dark (`--ink`, `--surface`, `--card`, `--line`, `--primary`, `--primary-ink`, `--floodlight`, `--clay`, `--danger`, `--muted`), `color-scheme`, and `prefers-color-scheme` with a manual override stored in a cookie.
- [ ] `tailwind.config.ts`: map tokens, spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96), radii (8, 14, 999), breakpoints (640, 1024), font families.
- [ ] `next/font`: Barlow Condensed (600, 700) as `--font-display`, Figtree (400, 500, 600) as `--font-body`. Tabular numbers on numeric components.
- [ ] Global focus ring (2 px Turf, 2 px offset), reduced-motion rules, selection color, scrollbar styling.

### 2.4 Base components (`components/ui`)
Build each with all states (default, hover, focus, disabled, loading, error) and a Vitest/RTL test:
- [ ] `Button` (primary, secondary, destructive, ghost; sizes; loading keeps width), `IconButton`.
- [ ] `Input`, `Textarea`, `Select`, `Combobox` (searchable), `Checkbox`, `Switch`, `RadioCards` (for big selectable cards), `DatePicker`, `DateTimePicker`, `NumberStepper`.
- [ ] `FormField` (label, helper, error with icon, `aria-describedby`), `FormErrorSummary` with anchor links.
- [ ] `Tabs` (underline style, scrollable on mobile with edge fade; sub-route aware), `Accordion`.
- [ ] `Badge` (Draft, Open, Live with pulsing dot, Completed, Cancelled), `Chip`.
- [ ] `Card`, `Skeleton` (respects reduced motion), `EmptyState` (icon, sentence, button), `Avatar` (initials fallback), `TeamLogo` (initials on name-derived color).
- [ ] `Dialog`, `ConfirmDialog` (names the item being changed), `Sheet` (mobile drawer), `Toast` + `useToast` (verb matches the button).
- [ ] `DataTable` (sticky header, row hover, stacked cards on mobile), `Pagination` and `LoadMore` (keyset aware).
- [ ] `Stepper` (wizard steps), `ProgressBar`, `StatTile`, `Tooltip`, `CopyButton`.
- [ ] `ImageUploader` (crop, client-side resize to max 1600 px WebP 0.85, upload to the right bucket under `<uid>/`, progress, error states).
- [ ] `LiveStrip` (pulsing Floodlight dot, link) with props only; data wired in Plan 9.
- [ ] A `/dev/ui` page (dev only) showing every component in light and dark.

### 2.5 Layout shells (spec section 6)
- [ ] `PublicHeader`, `AppHeader`, `Footer`, `WorkspaceSidebar` (desktop) / `BottomBar` (mobile, 4 items + More sheet), `Breadcrumbs`.
- [ ] `CitySelector`: searchable list of active cities. Logged out: stores a browsing cookie. Logged in: shows the profile city and, on change, opens the confirm dialog and calls `change_city`.
- [ ] `RoleSwitcher` (only roles the user has), `UserMenu`, `GlobalSearch` (UI only; query wiring in Plan 4), `NotificationsBell` (UI shell; data in Plan 3).
- [ ] Route-group layouts: `(public)` public header + footer; `(auth)` centered card with faint pitch-line pattern; `(app)` app header + sidebar/bottom bar; `(admin)` dark sidebar and "Admin" badge.

### 2.6 System pages
- [ ] `not-found.tsx` (J1), `error.tsx` + `global-error.tsx` (J2, shows an error reference ID), `/maintenance` (J3). Illustrations are simple line drawings (ball missing stumps, whistle).

### 2.7 Cross-cutting
- [ ] `next-intl` set up with an English catalogue; all strings in the catalogue. Hindi is **[OPEN]**; structure must allow adding it later.
- [ ] Formatting helpers: `formatINR(paise)`, `formatDate`, `formatDateTime` (India time), `formatNumberIN`.
- [ ] Rate limiting helper `lib/rate-limit.ts` (choose Upstash Redis or a Postgres counter; document the choice) with presets: `auth`, `contact`, `search`, `invite`.
- [ ] Error tracking provider chosen and wired (e.g. Sentry); a request ID is generated in middleware and attached to logs and the `/500` page.
- [ ] Security headers and CSP in `next.config.ts` (allow Supabase, Razorpay checkout script and frames, Google sign-in).
- [ ] Analytics: privacy-friendly page and event tracking behind a consent-free setup (no cookies) **[OPEN]**.
- [ ] CI (GitHub Actions): install, lint, typecheck, unit tests, Playwright smoke test, build; fail on bundle budget breach (landing under 150 KB JS gzipped).
- [ ] `README.md`: how to run locally, env vars, how to apply migrations and regenerate types.

## Acceptance criteria
- [ ] `npm run dev` shows public layout; light/dark toggle works and persists; city selector works for logged-out and logged-in users.
- [ ] `/dev/ui` renders every component without console errors; keyboard-only navigation works everywhere on it.
- [ ] Middleware: logged-out user visiting `/dashboard` goes to `/login?next=/dashboard`; non-admin visiting `/admin` is blocked.
- [ ] `lib/rpc.ts` returns friendly messages for at least 10 sample error codes (unit tested).
- [ ] Lint, typecheck, unit tests, and build pass in CI; landing JS budget respected.
- [ ] No server secret is present in the client bundle (check with a build analysis).

**Out of scope:** real pages (Plans 3 to 10).
