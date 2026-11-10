# Plan 4: Public site and discovery

**Goal:** everything a visitor sees without logging in, fast, cacheable, and shareable.

**Depends on:** Plans 1 and 2. **Read first:** `RULES.md` (sections 2, 4); spec sections 7, 8, 15 (standings and leaderboards), 16, 24.

**Pages (15 of 59):** A1 to A10, B1, B2 (all 8 tabs), B3, B4, B6. (B5 live room is Plan 9.)

## Tasks

### 4.1 Domain components (`components/domain`)
- [x] `TournamentCard` (3 px sport-colored top edge, banner or generated pattern, name, city, dates, status and squad-mode badges, "6 of 8 teams" progress from `approved_team_count`, organizer chip).
- [x] `FixtureTicket` (notched ticket shape via CSS mask, team logos and names, date/time/venue, status badge, score).
- [x] `StandingsTable` (cricket columns P W L T NR Pts NRR; football P W D L GF GA GD Pts; qualifying places tinted with legend; stacked cards on mobile).
- [x] `KnockoutBracket` (tree layout from `matches.next_match_id`; horizontal scroll on mobile with snap).
- [x] `LeaderboardCard` (top 10 with "View all" dialog), `ScoreboardHeader` (big Barlow numerals), `Scorecard` (cricket batting/bowling tables, football lineups/events), `PlayerCard`, `TeamCard`.
- [x] `CitySelector` data wiring (reads `cities` where `is_active`).

### 4.2 Marketing and info pages (A1 to A9)
- [x] **A1 Landing:** hero with count-up scoreboard card (once, reduced-motion safe), city strip with 3 tournaments, "three ways to use it" columns, auction section, fixtures-to-standings row, organizer callout, FAQ preview (5 items), final CTA. Static (ISR 5 min) except the city strip (client fetch).
- [x] **A2 How it works:** tabs For organizers / managers / players with true numbered steps; money note box.
- [x] **A3 Pricing:** read `pricing_tiers` (active) and `player_plans` (active) at request time with 5 min revalidation; if the query fails show "Pricing is unavailable right now" and **never** show stale or hard-coded numbers.
- [x] **A4 About**, **A6 FAQ** (accordion by group, live search; content from `site_settings.faq`), **A7/A8/A9 Terms, Privacy, Refund policy** (long-form with sticky table of contents, "Last updated" and version from `site_settings`). Terms must state that the platform is not part of money exchanged between users and that auction points are virtual.
- [x] **A5 Contact:** form (name, email, topic, message 2000) inserting into `contact_messages`; honeypot field; rate limit 5 per hour per IP; success and error states.
- [x] **A10 City page:** stats row (tournaments, teams, players via counters), filters, tournament grid, upcoming auctions list; 404 if the city is inactive.

### 4.3 Browse (B1 `/tournaments`)
- [x] Sticky filter bar: sport, city (default All), status, squad mode, date range, name search (trigram `ilike` using the `tournaments_name_trgm` index), "Clear filters".
- [x] Query `public_tournaments` filtered by `visibility = 'public'`; order: live first, then soonest start, then newest; keyset pagination (12 per page, "Load more" on mobile).
- [x] Filters live in the URL (shareable); results cached with `revalidate: 60`.
- [x] Empty and error states per spec.

### 4.4 Tournament page (B2) with sub-route tabs
- [x] Header block (banner 240 px, overlapping logo, badges, organizer chip, share button: copy link, WhatsApp, native share).
- [x] **Primary action area** as a client component (`<TournamentActions>`) that calls a small API to learn the viewer's state (role, city match, subscription status) so the page itself stays cacheable. States per spec B2 table; links go to Plan 7 pages.
- [x] Tabs as routes: `/` Overview, `/teams`, `/fixtures`, `/standings`, `/stats`, `/auction`, `/chat`, `/rules`.
  - Overview: about, key facts grid, prizes, venue link, organizer contact (only if shown), announcements, teams row.
  - Teams: grid from `public_teams`; "Join with your team" card when applications are open.
  - Fixtures: grouped by round/date from `matches` (only `fixture_published`), filter by team, live matches first.
  - Standings: table from `standings` or bracket for knockout; league + playoffs shows both.
  - Stats: leaderboards from `tournament_batting_stats`, `tournament_bowling_stats`, `tournament_fielding_stats`, `tournament_football_stats`.
  - Auction: state card (not scheduled / scheduled with countdown / live with Watch button / completed with results table). Hidden in direct mode. (Live room is Plan 9.)
  - Chat: members see the chat component (Plan 9); others see the pinned announcement and "Join this tournament to chat".
  - Rules: structured rules plus organizer text.
- [x] Draft/paid tournaments return 404 to non-owners (the view already hides them); cancelled shows a red banner with the reason; old slugs redirect using `slug_redirects`.
- [x] Cache with tag `tournament:<id>`; Plans 5 to 9 call `revalidateTag` after relevant mutations.

### 4.5 Team, match, player pages
- [x] **B3 Team:** header, squad cards (price in points if auctioned), fixtures and results, team stats; "Squad not finalised" until locked.
- [x] **B4 Match:** scoreboard header, result line, scorecard tabs, player of the match, notes; pre-match shows teams, date, venue, head-to-head count.
- [x] **B6 Player profile:** from `public_profiles` + `player_sport_profiles` + career views; respects `show_age`, `show_city`, `show_stats`; phone and DOB never shown; tournament history; "Report profile" via `report_content`.

### 4.6 SEO and sharing (spec 24)
- [x] `generateMetadata` for every page (unique title and description).
- [x] Open Graph images via `next/og` for tournaments, teams, matches (banner + name + dates + city; scoreboard image for matches).
- [x] `SportsEvent` JSON-LD on tournament pages; `sitemap.xml` (cities, public tournaments, teams, players with public profiles); `robots.txt` (block `/admin`, `/organizer`, `/manager`, `/player`, auth routes); unlisted tournaments `noindex`; canonical URLs on tab routes.

## Acceptance criteria
- [ ] Lighthouse mobile: LCP under 2.5 s, SEO 95+, accessibility 95+ on `/`, `/tournaments`, and a tournament page.
- [ ] Seeded with 200 tournaments, `/tournaments` renders in under 300 ms server time and issues at most 2 database queries.
- [ ] Anonymous user cannot see draft or paid tournaments, phone numbers, or application data (verified).
- [ ] Sharing a tournament link on WhatsApp shows the generated card.
- [ ] Changing a tournament's data and calling `revalidateTag` updates the page within a few seconds.
- [ ] Playwright: browse with filters, open tournament tabs, open team, match, player pages.

**Out of scope:** applying, paying, and organizer actions (Plans 5 to 7).
