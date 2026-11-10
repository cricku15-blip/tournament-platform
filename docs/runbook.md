# Runbook

Keep this open on launch day. Who to call first is the owner; escalate to the engineering contact for anything touching money or the database.

## Where to look
- **App errors:** the error tracker (set `SENTRY_DSN`); every response carries an `x-request-id` header you can search for.
- **Database:** Supabase Dashboard > Logs and Reports; Query Performance for slow queries.
- **Edge Functions:** Dashboard > Edge Functions > Logs (webhook, order, subscription, refunds, reminders).
- **Payments:** Razorpay Dashboard > Payments and Webhooks (delivery log, Retry button).
- **Status of the site:** `GET /api/health` returns `{ ok, db, ms }`.
- **Admin > Payments** shows recent webhook events with their errors; **Admin > Audit log** shows every admin action.

## Webhook failing
Symptoms: payments succeed at Razorpay but tournaments stay unpaid, or the failed-webhooks tile on the admin dashboard is above 0.
1. Admin > Payments > "Recent webhook events": read the error text.
2. Razorpay Dashboard > Webhooks > your endpoint > failed deliveries. Check the signature secret equals `RAZORPAY_WEBHOOK_SECRET` in Supabase secrets.
3. Edge Functions > `razorpay-webhook` > Logs.
4. After fixing, **Retry** each failed event in Razorpay. Replays are safe (idempotent on `webhook_events`).
5. If events are older than 24 h and Retry is unavailable, mark the payment manually: check `tournament_payments.razorpay_payment_id` in Razorpay, then run `select public.confirm_tournament_payment(...)` as the service role (get the exact call from the function reference in plan-1 Part F). Write an audit row.

## Payment stuck (user paid, nothing happened)
1. Find the payment in Admin > Payments by order or payment ID.
2. Status `created` and Razorpay shows captured: the webhook did not arrive. Follow "Webhook failing".
3. Status `failed` at Razorpay: tell the user they were not charged (or refund if they were).
4. Duplicate charge: Admin > Payments > Mark for refund, then approve in Admin > Refunds.
Never ask a user to pay again until you have checked the above.

## Auction crash or console lost
1. Reload the console: it resumes from the database. Nothing is lost; bids are stored before they are broadcast.
2. If Realtime is down (spectators frozen): the room re-reads the database every 20 s on its own. Tell managers to keep the page open.
3. If a lot is stuck on the block: console > Unsold, or Sold if there is a bid. As a last resort: Admin > Tournaments > Force status is for tournament status only, not lots; use SQL on the lot row and add an audit row.
4. To stop bidding site-wide: Admin > Settings > feature flag `live_auction` off.
5. Wrong bid: console > Undo last bid with a reason (audited).

## Bad deploy: roll back
1. Hosting dashboard (Vercel): Deployments > previous good deployment > Promote to production. Takes seconds.
2. Database migrations are append-only. Do not edit an applied migration. If a migration is bad, write the next numbered migration that fixes it.
3. Edge Functions: redeploy the previous commit's function (`git checkout <sha> -- supabase/functions/<name> && supabase functions deploy <name>`).
4. Turn on maintenance mode first if users are being harmed: Admin > Settings > Maintenance mode (no deploy needed).

## Maintenance mode
Admin > Settings > Maintenance mode. Takes effect within about 30 seconds. Admins can still sign in.

## Alerts to set up (see docs/launch-checklist.md)
Webhook errors, failed payment spike, auction function errors, 5xx rate, uptime on `/` and `/api/health`, database CPU and connections, storage growth.
