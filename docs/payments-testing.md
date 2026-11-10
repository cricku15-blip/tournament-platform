# Testing payments (test mode only)

Never use live keys or real money before the Plan 10 launch checklist.

## 1. Keys and secrets
1. Razorpay dashboard in **Test mode** > Settings > API Keys > generate a key pair.
2. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and a long random `RAZORPAY_WEBHOOK_SECRET` in `.env` (never commit it).
3. Push them to the Edge Functions: `supabase secrets set --env-file .env` (or set each with `supabase secrets set NAME=value`).
4. Webhook URL (Razorpay > Settings > Webhooks): `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`
   - Secret: the same `RAZORPAY_WEBHOOK_SECRET`.
   - Events: `payment.captured`, `payment.failed`, `order.paid`, `subscription.*`, `refund.*`.

## 2. Test instruments
- Cards: Razorpay test card numbers from the dashboard docs (any future expiry, any CVV, OTP `1234` on the bank page).
- UPI: `success@razorpay` succeeds, `failure@razorpay` fails.
- Subscriptions: use the same test cards. UPI AutoPay works in test mode with the success VPA.

## 3. Local webhooks
1. `supabase functions serve razorpay-webhook --env-file .env`
2. Expose it: `cloudflared tunnel --url http://localhost:54321` (or ngrok). Use `<tunnel>/functions/v1/razorpay-webhook` as a **second** test-mode webhook endpoint.
3. Remove the extra endpoint when done.

## 4. Replay an event
Razorpay dashboard > Webhooks > your endpoint > an event > **Retry**. The webhook is idempotent (`webhook_events` unique key), so a replay must change nothing. Check `webhook_events` and `tournament_payments.status` before and after.

## 5. Manual end-to-end checklist
- [ ] Draft tournament -> Pay -> test card -> "Confirming payment" -> Paid -> Publish works.
- [ ] Double-click Pay: only one `tournament_payments` row with status `created`.
- [ ] Close the Razorpay window: nothing charged, page returns to idle.
- [ ] `failure@razorpay`: "Payment didn't go through. You haven't been charged."
- [ ] Stop the webhook (disable endpoint), pay: page shows the delayed-confirmation message; re-enable and retry the event: status becomes paid without a second charge.
- [ ] Upgrade plan: only the tier difference is charged; `team_count` rises after the webhook.
- [ ] Subscribe -> `subscriptions.status = active` -> can apply. Cancel -> can still apply until `current_period_end`, then blocked; existing application/squad untouched.
- [ ] Replay the same webhook 3 times: no duplicate payments, notifications or invoices.

## 6. Automated
`npm test` covers `withTax`, the poll helper and apply-eligibility reasons. Full browser flows with Razorpay mocked are part of the Plan 10 test suite.
