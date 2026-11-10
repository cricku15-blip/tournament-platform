# Performance findings

Status: **template, not yet filled in.** The load tests need a staging project (Plan 10 Part B). Fill this in after running them.

## How to run the review
1. Create a staging Supabase project sized like production. Apply all migrations.
2. `psql "$STAGING_DB_URL" -f scripts/seed-staging.sql`
3. Run the k6 scripts in `loadtest/` (see `loadtest/README.md`).
4. Dashboard > Database > Query Performance (pg_stat_statements). Sort by total time and by mean time. Record every statement with p95 over 100 ms, or a sequential scan on a big table.
5. For each finding run `explain (analyze, buffers)` on realistic data and fix it with an index, a view, or a query change (RULES.md section 2).

## Pass criteria (RULES.md sections 0 and 8)
| Check | Target | Result |
|---|---|---|
| Public cached pages, p95 server time | under 300 ms | |
| 1,000 VUs browsing for 10 min | error rate under 1% | |
| 200 simultaneous logins | p95 under 2 s, no failures | |
| Bid accepted to every screen | under 1 s (p95) | |
| 16 bidders in the same second | exactly one accepted per step | |
| 300 spectators | no presence traffic | |
| 500 webhook events with duplicates | no duplicate payments | |
| Chat, 100 users at 1 msg / 5 s | p95 under 500 ms | |

## Queries to check first (most likely hot)
- `public_tournaments` list with filters and `ilike` on name (`tournaments_name_trgm`, `tournaments_city_status_idx`).
- `place_bid` (row locks on `auction_lots`, `team_purses`): look for lock waits during the bid storm.
- `tournament_*_stats` views over `matches` + stat tables once 3,000 tournaments exist; if over 100 ms, convert to a materialized view refreshed in `publish_match_result` with a unique index (RULES.md 2.7).
- Notifications list (`notifications_user_idx`) and unread count (`notifications_unread_idx`) with 500,000 rows.
- Admin dashboard `admin_dashboard()` and the audit log list (`audit_log_created_idx`).
- RLS helper functions `tournament_is_published`, `is_tournament_member` called per row: confirm they are `stable security definer` and that the columns they read are indexed.

## Findings log
| Date | Statement or page | Measured | Fix | Re-measured |
|---|---|---|---|---|
| | | | | |
