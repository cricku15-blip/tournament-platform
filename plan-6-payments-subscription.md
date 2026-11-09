# Plan 6: Payments and subscription (web side)

**Goal:** organizers can pay the tournament fee and publish; players can subscribe monthly; the app gates player applications correctly. All money logic runs through Plan 1's Edge Functions and webhook.

**Depends on:** Plans 1 to 5. **Read first:** `RULES.md` (sections 1.2, 3); spec section 20.

**Pages (2 of 59):** H5 `/organizer/tournaments/[id]/checkout`, D4 `/subscription`.

**Money model reminder:** only two things are charged: the organizer's one-time tier fee per tournament (Razorpay Order) and the player's monthly subscription (Razorpay Subscription). Entry fees and auction money are outside the platform. **Browser callbacks are never trusted; only the webhook marks things paid.**

## Tasks

### 6.1 Razorpay client helpers
- [ ] `lib/razorpay/load.ts`: dynamically load `https://checkout.razorpay.com/v1/checkout.js` only on the two payment pages (never in the global bundle).
- [ ] `lib/razorpay/checkout.ts`: `openOrderCheckout({ orderId, amount, keyId, name, prefill })` and `openSubscriptionCheckout({ subscriptionId, keyId, prefill })` returning promises for success/dismiss; success handler **only** triggers status polling.
- [ ] `lib/payments/poll.ts`: poll a status endpoint every 2 s for up to 60 s with exponential backoff after 20 s; resolves on `paid`/`active`; on timeout returns "pending" (not failure).
- [ ] Route handlers (server) that call the Edge Functions with the user's JWT: `POST /api/payments/tournament-order`, `POST /api/payments/subscription`, `POST /api/payments/subscription/cancel`, and read-only `GET /api/payments/tournament/[id]/status`, `GET /api/payments/subscription/status`. Rate limit each.

### 6.2 Organizer checkout (H5)
- [ ] Layout per spec 20.1: left order summary (tournament, sport, city, "N teams (tier X to Y)", fee, tax line, total, all from the server response, formatted with `formatINR`), right panel with **Pay <total>**, note "Your tournament goes live right after payment", link to Refund policy, back link "Edit tournament".
- [ ] Flow: click Pay (button disabled while working) -> `create-tournament-order` -> Razorpay modal -> "Confirming payment..." state with polling -> on `paid`: success screen with **Publish tournament** (calls `publish_tournament`) and invoice link.
- [ ] States: not owner (404), tournament not draft (redirect to manage page), amount too low or tier missing (friendly error), payment failed ("Payment didn't go through. You haven't been charged." + Try again), delayed confirmation ("We're confirming your payment. This can take a few minutes. You don't need to pay again."), closed modal (no change).
- [ ] Reuse recent unpaid order (Edge Function already does); verify double click creates one order.
- [ ] **Upgrade plan** (Plan and payment tab in Plan 5): choose higher team count; call the same function with `target_team_count`; charges only the tier difference; after confirmation team count updates (handled by `confirm_tournament_payment`).
- [ ] Invoice download: server action creating a signed URL for the `invoices` bucket path stored in `invoice_url`.

### 6.3 Player subscription (D4)
- [ ] Status card variants per spec 20.2: Not subscribed, Active (renewal date, plan, amount, method), Cancelled but active until period end (with **Resume**), Past due (Clay banner + **Fix payment**), Expired.
- [ ] **Start subscription** -> `create-subscription` -> Razorpay subscription checkout (UPI AutoPay or card) -> polling until `active`.
- [ ] **Cancel subscription** -> confirm dialog stating the end date and "Existing registrations stay valid" -> `cancel-subscription`.
- [ ] **Resume** creates a new subscription starting at the current period end (Edge Function handles `start_at`).
- [ ] Billing history table from `subscription_payments` (date, description, amount, status, receipt via signed URL); mobile cards.
- [ ] "What it covers" list and 4-question FAQ per spec.
- [ ] Plan details (name, price, benefits) from `player_plans` where `is_active`.

### 6.4 The gate in the UI (no business rules here, only messages)
- [ ] `useApplyEligibility(tournamentId)` / server helper returning `{ canApply, reason }` where `reason` is one of `not_logged_in | registration_closed | city_mismatch | subscription_required | already_applied | ok` (read-only checks mirroring Plan 1; the database remains the enforcer).
- [ ] Wire the tournament page action area (Plan 4) and apply page (Plan 7) to these reasons with the exact copy from spec 26: "Switch city" and "Start subscription" buttons.
- [ ] Dashboard subscription card (Plan 3) now links to `/subscription` and shows live status.
- [ ] Lapsed subscription: existing applications, pool entries, and squads untouched; only new applications blocked (test this explicitly).

### 6.5 Notifications and emails
- [ ] Payment confirmed (organizer), subscription renewal in 3 days, payment failed: insert notifications and send email through `send-email` from the webhook or a scheduled job (add to the webhook function only if trivial; otherwise a Plan 9 scheduled job).

### 6.6 Testing payments (test mode only)
- [ ] Document in `docs/payments-testing.md`: Razorpay test keys, test UPI/cards, how to run `supabase functions serve` plus a tunnel for local webhooks, how to replay an event from the Razorpay dashboard.
- [ ] Playwright with the Razorpay checkout mocked at the script level for CI; one **manual** end-to-end run with real test-mode checkout before launch.
- [ ] Unit tests for `withTax` (inclusive and exclusive), poll helper, and eligibility reasons.

## Acceptance criteria
- [ ] Draft tournament -> Pay (test mode) -> tournament becomes `paid` only after the webhook; Publish works; double-clicking Pay does not create two orders; replaying the webhook changes nothing.
- [ ] Closing the Razorpay modal charges nothing and shows the correct state.
- [ ] Player subscribes (test mode) -> `subscriptions.status = 'active'` -> can apply; cancels -> still can apply until `current_period_end`, then cannot; existing registrations remain.
- [ ] No amount, tax, or tier is computed in the browser for payment purposes.
- [ ] Checkout pages load the Razorpay script only on those routes (verify bundle).
- [ ] Failed and delayed payment states render with the exact copy above.

**Out of scope:** admin refund UI and payment tables (Plan 10).
