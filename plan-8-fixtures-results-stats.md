# Plan 8: Fixtures, results, standings, and player stats

**Goal:** an organizer can generate and publish fixtures, enter match results and stats, and standings, brackets, leaderboards, and player stats update automatically.

**Depends on:** Plans 1 to 7. **Read first:** `RULES.md`; spec sections 13 (H4 Fixtures/Results tabs, H7), 15, 16.

**Pages (2 of 59):** H7 `/organizer/tournaments/[id]/matches/[matchId]/result`, E3 `/player/stats`. Plus the Fixtures and Results tabs inside H4 and the data wiring of the public tabs built in Plan 4.

## Tasks

### 8.1 Fixtures tab (H4)
- [x] **Generate fixtures** dialog showing the format summary and the calculated total matches, with options: start date, matches per day (clamped by the function), time slots (list of `HH:MM`), venues/grounds list, seeding (random or manual order via drag and drop of teams). Calls the `generate-fixtures` Edge Function (`action: 'generate'`). Disabled until teams are approved and the tournament status allows it; shows `need_three_teams`, `results_exist`, `invalid_status` as friendly messages.
- [x] After generation: list grouped by round/stage; each match editable (date/time, venue, swap teams only before the match, postpone/cancel with reason by updating `matches.status`). Warn when editing a match that already has a result.
- [x] **Publish fixtures** toggles `fixture_published` for all or selected matches (organizer update allowed by RLS). Publishing notifies team members (use `post_announcement` with a system title) and calls `revalidateTag`.
- [x] League then playoffs: after all league results are published show **Start playoffs** (calls `generate-fixtures` with `action: 'playoffs'`), previewing the qualifying teams from `standings`.
- [x] **Go live** (`go_live`) available once fixtures are published; **Complete tournament** (`complete_tournament`) near the end.
- [x] Add-to-calendar `.ics` per team already in Plan 7 now has real data. (Built in Plan 7; works once fixtures are published.)

### 8.2 Results tab and list
- [x] List of matches with status chips (Scheduled, Live, Completed) and per-match actions: **Set live** (`set_match_live`), **Enter result**, **Edit result**. Matches whose teams are still unknown (knockout placeholders) show their labels ("Winner of match 3") and a disabled action.
- [x] A "Needs result" count feeds the organizer dashboard "Needs your attention" list.

### 8.3 Result entry page (H7)
Goal: under 5 minutes for a typical match. Required fields are few; stats are optional but encouraged.
- [x] Header with both teams, date. Result status: Completed, Tied/Drawn, No result, Abandoned, Walkover (choose winner). Winner and margin are **suggested** from the scores and can be overridden. Player of the match (search only the two squads). Notes.
- [x] **Cricket form** (data from spec 15.2): per innings team total (runs, wickets, balls faced, extras), `balls_nrr` (if the team was all out, full overs quota in balls), batting rows (runs, balls, fours, sixes, dismissal type, bowler, fielder), bowling rows (**balls bowled** shown as overs, maidens, runs, wickets, wides, no-balls), fielding rows, toss. Strike rate and economy calculated in the UI. Writes `matches.score_a/score_b/toss`, `cricket_batting`, `cricket_bowling`, `cricket_fielding`.
- [x] **Football form** (spec 15.3): full-time score (+ half-time, extra time, penalties), lineups (starters and substitutes from the squad, **position** per player, needed for clean sheets), events repeater (goal, own goal, penalty goal, yellow, red, substitution with minute and assist). Writes `matches.score_a/score_b`, `football_lineups`, `football_events`.
- [x] **Save as draft** (writes data, leaves `result_published_at` null: not public) and **Publish result** (calls `publish_match_result`). Completeness check before publishing: totals vs player entries, with a confirm-anyway option.
- [x] Editing a published result: re-save then call `publish_match_result` again (recomputes standings, re-advances winners, writes an audit row). Handle `next_match_already_played` with a clear message.
- [x] Optimistic concurrency: store `updated_at`; if changed by someone else, show "This result was updated by someone else. Reload to see changes."
- [x] Autosave drafts every 10 s; keyboard-friendly tables (Tab/Enter move between cells, numeric inputs with steppers).

### 8.4 Public data wiring (finish Plan 4 tabs)
- [x] Standings tab reads `standings` ordered by `position`; knockout bracket built from `matches` and `next_match_id`; league + playoffs shows table then bracket.
- [x] Stats tab leaderboards use the stats views from Plan 1 (batting, bowling, fielding, football); top 10 with "View all" (paged); minimums (best strike rate: 30 balls; best economy: 6 overs = 36 balls).
- [x] Match page scorecards read the stats tables; team page shows team stats.
- [x] After `publish_match_result` call `revalidateTag` for the tournament, the two teams, the match and the involved players.

### 8.5 Player stats (E3)
- [x] Sport switcher; summary tiles (cricket: matches, runs, wickets, best score; football: matches, goals, assists, cards) from `player_cricket_career`, `player_bowling_career`, `player_football_career`.
- [x] Per-tournament table and simple bar charts (runs or goals per match) loaded with a dynamic import of the chart library; share button; respects `show_stats` on the public profile.

## Acceptance criteria
- [ ] Generate fixtures for 3 to 8 teams in each format; match counts equal the spec formulas; no team plays twice in a day in a league round; knockout byes go to top seeds; third place match wired when enabled.
- [ ] Publishing a league result updates `standings` within one request; cricket NRR matches a hand-computed example; football ordering uses GD then GF.
- [ ] Publishing a knockout result fills the next match; editing it re-fills correctly or is blocked if the next match was played.
- [ ] Playoff generation refuses while league matches are unfinished; for the qualifier style the four-match structure links correctly.
- [ ] Leaderboards and E3 show correct numbers after entering stats for 3 sample matches (verified against a spreadsheet).
- [ ] Non-organizers cannot write matches or stats (direct API test).
- [ ] Playwright: generate, publish fixtures, enter and publish a cricket result and a football result, see standings and leaderboard change.

**Out of scope:** live ball-by-ball scoring (not in v1).
