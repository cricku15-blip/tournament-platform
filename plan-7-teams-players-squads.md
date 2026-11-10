# Plan 7: Teams, players, applications, and squads

**Goal:** players apply, managers get access and build squads (direct mode), and everyone sees their own workspace.

**Depends on:** Plans 1 to 6. **Read first:** `RULES.md`; spec sections 3, 10 (D6), 11, 12 (F1, F2).

**Pages (7 of 59):** G1 `/tournaments/[slug]/apply-player`, G2 `/tournaments/[slug]/apply-team`, D6 `/join/[code]`, E1 `/player/applications`, E2 `/player/tournaments`, F1 `/manager/teams`, F2 `/manager/teams/[teamId]` (5 tabs). (E3 is Plan 8, F3 is Plan 9.)

## Tasks

### 7.1 Apply as a player (G1)
- [x] Server-side **entry checks in order** with the exact blocking messages and buttons from spec G1: logged in, registration open and not past deadline and not full, **city match** (button "Switch to <City>" with confirm dialog calling `change_city`), **active subscription** (button "Start subscription"), not already applied (show current status), required sport profile fields (inline prompt).
- [x] Form: role/position (prefilled), batting hand + bowling style or preferred foot (from `sports.config.profile_fields`), experience level, contact phone (prefilled), availability checkbox, notes (300), the organizer's custom questions, and the "payments happen outside this platform" checkbox.
- [x] Submit calls `apply_as_player`; map every error code to a friendly message; success page shows status Pending and links to E1. Sticky summary box (tournament, dates, squad mode, auction date).
- [x] Re-apply after withdrawal works (database handles it).

### 7.2 Apply with a team (G2)
- [x] Only for tournaments with `team_entry` open or both and registration open. Fields: team name (unique per tournament), logo, two colors, home ground, manager phone (prefilled), expected squad size, notes, payments checkbox. Calls `apply_with_team`.
- [x] Success shows Pending; organizer approves in Plan 5's Teams tab; on approval the applicant is already the manager (the function sets `manager_id`).

### 7.3 Accept invite (D6)
- [x] `/join/[code]`: look up the invite through a server action (service role, returns only safe tournament/team summary for valid codes; nothing for invalid ones). Card per spec with **Accept and manage team** (`accept_team_invite`) and **Decline**.
- [x] Logged-out visitors see "Log in to accept" and the code survives login (`next`). Handle invalid/expired/used codes ("This invite isn't valid anymore. Ask the organizer for a new one.") and `already_manager_in_tournament`.
- [x] After accepting, add the Manager role (derived from data) and redirect to `/manager/teams/[teamId]`.
- [x] Rate limit the code lookup.

### 7.4 Player workspace (E1, E2)
- [x] **E1 My applications:** tabs All / Pending / Approved / Rejected / Withdrawn; row states exactly as spec (Pending with **Withdraw** via `withdraw_application`; Approved in auction mode with date and **Watch auction**; Approved in direct mode; Picked with team and points; Not picked this time (neutral wording); Rejected with reason). Empty state with "Find tournaments in <city>".
- [x] **E2 My tournaments:** cards for squad memberships (tournament, team, role, next match, team standing, my stats placeholder until Plan 8); completed ones collapsed.

### 7.5 Manager workspace (F1, F2)
- [x] **F1 My teams:** cards with logo, tournament, status, squad "9 of 11 (min 7)", next fixture, auction state; empty state with invite-code input.
- [x] **F2 Team workspace** (access: manager of that team, organizer, admin):
  - **Overview:** tiles (squad, next match, standing, auction status), auto-ticking checklist (logo, minimum squad, confirm before deadline), organizer announcements.
  - **Squad:** table (avatar, name, role, jersey number editable via `set_jersey_number`, source, price, status). Direct mode: **Add player** dialog with *Search registered players* (search `public_profiles` by name/username using the trigram index, rate limited, only shows players in the tournament's city to match `add_squad_player`) and *Invite by link* (shareable link to sign up; the manager adds them after they join; mark clearly as manual in v1). Remove player (`remove_squad_player`). Auction mode: read-only with "Squad is set by the auction." Min/max banner ("Min 7, max 11. 2 more needed."). **Lock squad** (`set_squad_lock`) with confirm; only the organizer can unlock.
  - **Invites:** pending player invites list (v1: shows manual invites the manager made, resend/cancel) **[OPEN: assistant manager invite is v2]**.
  - **Fixtures:** the team's fixtures with an **Add to calendar** link (server route returning an `.ics`).
  - **Team profile:** edit name (blocked after registration closes: database raises `team_name_locked`), logo, colors, description, home ground.
- [x] All mutations call `revalidateTag('tournament:<id>')`.

### 7.6 Roles and navigation
- [x] Manager role appears in the role switcher only when the user manages an approved team; Organizer when they own a tournament; sidebar items per spec 6.4.
- [x] Dashboard (Plan 3) cards now link to these pages.

## Acceptance criteria
- [ ] Player in another city is blocked with the exact message and a working Switch city button; player without subscription is blocked with Start subscription; a correct player applies successfully.
- [ ] An organizer's invite link works once; a second use shows the invalid message; a user already managing a team in that tournament is refused.
- [ ] Manager adds and removes players until the squad is locked; cannot exceed max (database error `squad_full` shown nicely); cannot edit after lock; cannot touch another team (direct API test returns forbidden).
- [ ] Player withdrawal removes the pool entry only while the pool is unlocked.
- [ ] Open team application -> organizer approves -> applicant sees the team in F1.
- [ ] Playwright: apply-player happy path and each blocked state; invite accept; squad add/remove/lock.

**Out of scope:** auction bidding (Plan 9), stats (Plan 8).
