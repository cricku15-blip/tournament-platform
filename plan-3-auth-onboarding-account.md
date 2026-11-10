# Plan 3: Auth, onboarding, and account pages

**Goal:** users can sign up, choose a city, build a profile, and manage their account and notifications.

**Depends on:** Plans 1 and 2. **Read first:** `RULES.md`; spec sections 3, 9, 10 (D1, D2, D3, D5), 19.

**Pages (9 of 59):** C1 `/login`, C2 `/signup`, C3 `/auth/check-email`, C4 `/auth/callback`, C5 `/onboarding`, D1 `/dashboard`, D2 `/profile`, D3 `/settings`, D5 `/notifications`.

## Tasks

### 3.1 Authentication
- [x] `/login` and `/signup` exactly as spec C1/C2: "Continue with Google", email magic link + 6-digit code, terms and privacy links, `?next=` support, friendly errors (invalid email, too many attempts, provider failure).
- [x] `/auth/check-email`: shows the address, 6-box code entry (auto-advance, paste support), **Resend** with 60 s countdown, **Use a different email**.
- [x] `/auth/callback` route handler: exchange the code, then route to `/onboarding` (no `onboarded_at`), else to `next` or `/dashboard`; expired link state with "Request a new link".
- [x] Log out (current device) and "Log out of all devices" (Settings).
- [x] Rate limit email sends per IP and per address using `lib/rate-limit.ts`.

### 3.2 Onboarding wizard (C5)
- [x] Step 1 city: searchable active cities, "Detect my location" (browser geolocation to nearest active city, optional), "My city isn't listed" form inserting into `city_requests`.
- [x] Step 2 about you: full name, username (live availability check against `public_profiles`, regex `^[a-z0-9_]{3,20}$`), photo (ImageUploader to `avatars/<uid>/`), phone (optional, **not verified**), date of birth (under 13 blocked; under 18 sees the consent note **[OPEN: legal review]**).
- [x] Step 3 intent: multi-select cards Play / Manage a team / Organize; if Play, optional sport profile per sport (roles/fields come from `sports.config.profile_fields`).
- [x] On finish set `profiles.onboarded_at = now()`; save `player_sport_profiles`; toast "You're all set, <first name>."; redirect to `/dashboard`.
- [x] Wizard state survives a page refresh (session storage) and each step validates with Zod.

### 3.3 Dashboard shell (D1)
- [x] Role-aware sections per spec D1 (Player, Manager, Organizer views) driven by the role switcher; greeting by time of day.
- [x] Player view: subscription card (status only; actions wired in Plan 6), "Open in your city" (up to 6 from `public_tournaments` where `status = 'registration_open'` and city = profile city; apply button links to the tournament), applications counts (from `player_applications`), upcoming matches (placeholder until Plan 8).
- [x] Manager view: team cards from `teams where manager_id = me` (squad size vs minimum, next fixture placeholder).
- [x] Organizer view: 4 stat tiles and a "Needs your attention" list computed from status (unpaid draft, pending applications count, matches without results later).
- [x] New-user empty state: Find a tournament, Create a tournament, "Have an invite code?" input (routes to `/join/<code>`).
- [x] All queries are 1 to 2 round trips per section; use `Promise.all` in the server component; Suspense boundaries per section.

### 3.4 Profile (D2)
- [x] Left column photo + live preview of the public card; right column forms: basic (name, username, bio 240, city via `change_city`, phone), sport tabs (fields from `sports.config`), visibility toggles (`show_age`, `show_city`, `show_stats`).
- [x] Sticky "You have unsaved changes: Save changes / Discard" bar; navigation guard; optimistic UI not allowed for username (check first).

### 3.5 Settings (D3)
- [x] Sections: Account (email read-only, connected Google), City, Notifications (per category toggles saved to `notification_settings.prefs`; billing and security are locked on), Appearance (theme; language placeholder), Privacy and data (**Download my data** as JSON via a server action, **Delete my account**), Danger zone.
- [x] Delete account server action (admin client): block with a clear message if the user owns a non-completed tournament; otherwise delete the auth user (profile cascades). Squad history stays anonymised through existing foreign keys; confirm dialog explains this.

### 3.6 Notifications (D5 and bell)
- [x] `NotificationsBell` popover: last 10 from `notifications`, unread count from the partial index, mark read on click, "View all".
- [x] `/notifications` page: grouped Today / Earlier, tabs All/Unread, **Mark all as read**, keyset pagination (30 per page), empty state.
- [x] Realtime: subscribe to `notifications` filtered by `user_id` for the bell; unsubscribe on unmount.

## Acceptance criteria
- [ ] New user: Google or email sign-in, onboarding, lands on dashboard with `onboarded_at` set and `city_id` stored.
- [ ] A user cannot reach the app without finishing onboarding; cannot set `is_admin` or `status` (try via the browser console and confirm the database rejects it).
- [ ] Changing city updates the profile and the header immediately; existing data untouched.
- [ ] Settings toggles persist; deleting an account with an active tournament is blocked.
- [ ] Notification arrives in the bell within 2 seconds of a row being inserted.
- [ ] Playwright: sign-up to dashboard flow, profile edit, city change, notification read.
- [ ] Lighthouse accessibility score 95+ on `/login` and `/onboarding`.

**Out of scope:** subscription purchase (Plan 6), tournament pages (Plan 4).
