# Plan 5: Organizer workspace and tournament creation

**Goal:** an organizer can create a tournament, pay (Plan 6 completes checkout), publish it, bring in teams and players, and run it through its status stages.

**Depends on:** Plans 1 to 4. **Read first:** `RULES.md`; spec sections 13 (H1 to H4), 14 (every form field), 15.1, 17.2.

**Pages (4 of 59):** H1 `/organizer`, H2 `/organizer/tournaments`, H3 `/organizer/tournaments/new`, H4 `/organizer/tournaments/[id]` (12 tabs). H5 (checkout) is Plan 6; H6 console is Plan 9; H7 results is Plan 8.

## Tasks

### 5.1 Overview and list (H1, H2)
- [x] H1: stat tiles from counters, "Needs your attention" (unpaid draft, pending applications, pending team approvals, unlocked pool, missing results), "Next up" list, empty state.
- [x] H2: tabs All / Drafts / Awaiting payment / Open / Live / Completed / Cancelled; table with Manage, **Duplicate** (copies setup only; new slug; draft), kebab (Share link, Delete draft). Keyset pagination.

### 5.2 Creation wizard (H3)
- [x] 7 steps exactly as spec section 14 (Basics, Format and teams, Match rules, Squad and auction, Registration and visibility, Prizes and rules, Review and plan). One Zod schema per step, shared with server actions.
- [x] **Autosave as draft:** first step inserts the draft (`tournaments` insert; the guard forces `status = draft`); later steps update. Show "Saved 2 minutes ago". Navigation guard on unsaved changes.
- [x] Slug: auto from name, editable until publish, live uniqueness check, 3 suggestions when taken.
- [x] Number of teams: dropdown limited to the highest active `pricing_tiers.max_teams`; shows the **tier name and fee** from `pricing_tiers` (read-only here; never computed in the browser for payment).
- [x] Match rules step is **driven by `sports.config`** (cricket: format, overs, powerplay, super over, points, tiebreakers; football: format, halves, extra time, penalties, substitutions, points, tiebreakers). Saved into `tournaments.rules`.
- [x] Format step shows a live "Total matches" calculation and mini diagrams for each format (league, knockout, league then playoffs).
- [x] Squad and auction step: squad mode, min/max squad, pool cap; if Auction, also creates/updates `auction_settings` (purse, categories, base prices, increment slabs table editor, reserve rule, category limits, sequence mode, optional date). Squad mode locks after payment.
- [x] Registration step: team entry mode, deadlines, custom questions (max 3), visibility, organizer contact toggle, entry-fee info text (display only).
- [x] Prizes step: prize repeater (max 5), individual awards checklist, rich text rules (sanitised HTML or Markdown; max 6000 chars), code of conduct checkbox.
- [x] Review step: summary with "Edit" links, plan card, **Save as draft** and **Continue to payment** (goes to `/organizer/tournaments/[id]/checkout`, built in Plan 6).
- [x] Image uploads: banner (16:9 crop) and logo (square) via `ImageUploader` to `tournament-banners/<uid>/`.

### 5.3 Tournament manager shell (H4)
- [x] Header with name, status badge, public link copy, and the **status stepper** (Draft, Paid, Registration open, Registration closed, Auction, Squads locked, Live, Completed).
- [x] **Overview tab:** "Next step" card mapping status to the single best action and the right RPC: `paid` to **Publish** (`publish_tournament`), `registration_open` to **Close registration**, `registration_closed` to **Lock pool / Start auction** or **Lock squads**, `squads_locked` to **Generate fixtures** (Plan 8) then **Go live** (`go_live`), `live` to **Complete** (`complete_tournament`); recent activity feed; public link.
- [x] **Setup tab:** same fields as the wizard; locked fields (sport, city, squad mode, team count) disabled with an explanation after payment; changing dates notifies members (insert notifications through a server action using `_notify_members`-equivalent flow: call `post_announcement` with a system title).
- [x] **Teams tab:** Add team slot (insert team with status `invited`), **Invite manager** (`create_team_invite`, shows link and code, Copy and WhatsApp share), toggle accept team applications, table with Approve / Reject (`review_team`) / Resend invite / Remove; enforce the team cap in the UI (the database enforces it too).
- [x] **Applications tab:** filters (status, role, experience), search, counters, side drawer with the applicant's public profile and past stats, **Approve / Reject** (`review_application`; reject asks for an optional reason), bulk approve (sequential calls in chunks of 10 with progress).
- [x] **Player pool tab (auction mode) / Players tab (direct mode):** auction mode: edit category and base price per player or in bulk, sequence control (random / by category / manual drag and drop saved to `sequence_no`), **Lock pool** (`lock_pool`); direct mode: read-only squads grouped by team.
- [x] **Announcements tab:** compose and list; pin (`post_announcement`).
- [x] **Plan and payment tab:** tier, fee, status, invoice link (signed URL), **Upgrade plan** button (wired in Plan 6).
- [x] **Settings tab:** visibility, **Cancel tournament** (`cancel_tournament`, reason required, confirm dialog naming the tournament), **Delete draft**.
- [x] Tabs Auction, Fixtures, Results, Chat render placeholders linking to Plans 8 and 9; they are real routes (`?tab=`).
- [x] After every mutation call `revalidateTag('tournament:<id>')`.

### 5.4 Permissions
- [x] Every `/organizer/**` page checks ownership on the server (`organizer_id = me` or admin) and 404s otherwise; RLS is the real guard.

## Acceptance criteria
- [ ] An organizer can create a draft, edit it across sessions, and cannot change `status`, sport, city, squad mode or team count after payment (database rejects with `locked_field`).
- [ ] The fee shown matches `pricing_tiers` for the chosen team count; choosing a team count outside all tiers is impossible in the UI and rejected by the database.
- [ ] Invite flow: create invite, open the link in another browser, accept, team shows a manager (needs Plan 7 page; verify via SQL until then).
- [ ] Application approval adds the player to the pool (auction mode) and updates counters.
- [ ] Locked pool: further approvals fail with a friendly message.
- [ ] Playwright: create tournament through all 7 steps, publish (after Plan 6 payment in test mode), approve a player.
- [ ] A different user opening another organizer's manage URL gets 404.

**Out of scope:** payments UI (Plan 6), fixtures and results (Plan 8), auction console (Plan 9).
