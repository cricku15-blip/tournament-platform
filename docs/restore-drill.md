# Restore drill

Goal: prove a production backup can be restored and the app works against it. Do this once before launch and then every quarter.

## Steps
1. Supabase Dashboard (production) > Database > Backups. Confirm daily backups exist (needs a paid plan; Point in Time Recovery is better). Note the backup you will use and its time.
2. Create a **scratch** project (never restore over production). Same region and Postgres version.
3. Restore:
   - Dashboard backups can be restored into a project from the project settings; or
   - Take a logical dump of production: `supabase db dump --db-url "$PROD_DB_URL" -f prod.sql` (and `--data-only -f prod-data.sql`), then load into scratch with `psql "$SCRATCH_DB_URL" -f prod.sql -f prod-data.sql`.
4. Re-create what dumps do not carry: Storage objects (avatars, banners, invoices) are separate (download with the Storage API if needed), Auth providers and email templates, Edge Function secrets, and the Realtime publication (`select * from pg_publication_tables where pubname = 'supabase_realtime';` must list chat_messages, notifications, auction_events, auction_lots, team_purses).
5. Verify with `scripts/verify-db.sql` (RLS on every table, seed data, functions exist, anon cannot call server functions).
6. Point a local copy of the app at the scratch project (`.env` with the scratch URL and keys) and click through: log in, open a tournament, view standings, open the admin dashboard.
7. Compare row counts for the important tables with production: `profiles`, `tournaments`, `tournament_payments`, `subscriptions`, `squad_members`, `matches`.
8. Delete the scratch project when finished and record the result below.

## Record
| Date | Backup used | Time to restore | Verified by | Problems found |
|---|---|---|---|---|
| | | | | |
