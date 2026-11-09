# Claude Code plans: Sports Tournament Platform (web)

Give Claude Code this folder together with `tournament-platform-web-spec.md`.

| File | What it is |
|---|---|
| `RULES.md` | Scale and engineering rules for 10,000 to 15,000 users. Also save as `CLAUDE.md` in the repo root. |
| `plan-1-supabase-backend.md` | **All backend work:** 15 SQL migrations, 8 Edge Functions, scripts, dashboard steps, function reference, acceptance checks |
| `plan-2-web-foundation.md` | Next.js app, design system, layout shells, system pages (3 pages) |
| `plan-3-auth-onboarding-account.md` | Auth, onboarding, dashboard, profile, settings, notifications (9 pages) |
| `plan-4-public-site.md` | Marketing, browse, tournament/team/match/player pages, SEO (15 pages) |
| `plan-5-organizer-workspace.md` | Tournament wizard and manager (4 pages) |
| `plan-6-payments-subscription.md` | Organizer checkout and player subscription (2 pages) |
| `plan-7-teams-players-squads.md` | Applications, invites, player and manager workspaces (7 pages) |
| `plan-8-fixtures-results-stats.md` | Fixtures, result entry, standings, stats (2 pages + tabs) |
| `plan-9-auction-chat-realtime.md` | Live auction, chat, realtime (3 pages + tabs) |
| `plan-10-admin-hardening-launch.md` | Admin panel, load tests, security, launch (14 pages) |

**Total: 59 pages** (3 + 9 + 15 + 4 + 2 + 7 + 2 + 3 + 14).

**Order:** do the plans in numeric order. Plan 1 must be finished and tested first. Plans 3 and 4 can run in parallel after Plan 2; Plans 5 to 9 depend on earlier ones as noted in each plan's "Depends on".

**Start prompt for Claude Code:** "Read RULES.md, tournament-platform-web-spec.md and plan-1-supabase-backend.md. Execute Plan 1 task by task, ticking each checkbox, and stop at each manual dashboard step to tell me what to do."
