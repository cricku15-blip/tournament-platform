# Plan 9: Live auction, chat, and realtime experience

**Goal:** the organizer runs a live auction, managers bid from phones, everyone watches in real time, and each tournament has a group chat.

**Depends on:** Plans 1 to 8. **Read first:** `RULES.md` (**section 5 realtime rules are mandatory**); spec sections 13 (Auction tab), 17, 18, 19.

**Pages (3 of 59):** B5 `/tournaments/[slug]/auction/live`, F3 `/manager/teams/[teamId]/auction`, H6 `/organizer/tournaments/[id]/auction/console`. Plus the Auction tab in H4, the Auction and Chat tabs in B2, and the live strip.

## Tasks

### 9.1 Realtime foundation (`lib/realtime/`)
- [ ] `useAuctionChannel(tournamentId)`: subscribes to Broadcast channel `auction:<id>`; applies events (`lot_selected`, `bidding_opened`, `bid_placed`, `bid_undone`, `going_once`, `going_twice`, `lot_sold`, `lot_unsold`, `auction_paused`, `auction_resumed`, `auction_ended`) to a reducer.
- [ ] **Resync:** on first connect, on every reconnect, on tab focus, and every 20 s, fetch the snapshot (`auction_settings.status`, the lot on the block, `team_purses`, last 8 `bids`, counts) and reconcile; the database wins over events.
- [ ] Connection state (`connected | reconnecting | offline`) exposed to the UI; bid button disabled unless connected.
- [ ] Unsubscribe on unmount and when hidden for 60 s; resubscribe on focus.
- [ ] Presence only for the auctioneer and managers (to show "7 of 8 managers online"); spectators never join presence; spectator count from a cheap query refreshed every 30 s.
- [ ] Keep the reducer pure and unit-tested, including out-of-order and duplicate events.

### 9.2 Auction setup and readiness (H4 Auction tab)
- [ ] Settings form (already partially in Plan 5): purse, categories, base prices, increment slabs, reserve rule, category limits, sequence mode, unsold round, date/time.
- [ ] **Readiness checklist** (pool locked, every approved team has a manager, purses created, sequence set, at least 2 teams) with the **Start auction** button disabled until all pass; actions: `lock_pool`, `schedule_auction`, `start_auction`.
- [ ] **Simple mode** (organizer records results manually): a form per player to pick team and price in points, updating squads and purses in one server action (service-side validation mirroring the live rules).
- [ ] Results table after completion and **CSV export** (generated server-side).

### 9.3 Auctioneer console (H6, desktop first, usable on tablet/phone)
- [ ] Three-column layout per spec 17.4: Lot queue (search, filter by upcoming/sold/unsold, drag to reorder using `pool_players.sequence_no`), On the block (player card, base price, **current bid** in the largest numerals, holder), Teams (purse bars, squad counts, can-bid dots, online dots).
- [ ] Controls and the exact RPC for each: Select player (`select_lot`), Open bidding (`open_bidding`), Going once / twice (`announce_lot`), **SOLD** (`close_lot_sold`, enabled only with a bid), Unsold (`close_lot_unsold`), Undo last bid with required reason (`undo_last_bid`), Pause/Resume (`pause_auction`, `resume_auction`), End auction (`end_auction`, confirm dialog), Edit base price before bidding opens.
- [ ] Live bid history list; "Sold" stamp animation (short scale pop, reduced-motion safe); warnings when a manager is offline.
- [ ] Reopen safety: closing and reopening the console resumes from the database snapshot; managers see "Waiting for auctioneer" if the console is absent over 10 minutes.

### 9.4 Live room for managers and spectators (B5)
- [ ] Phone-first vertical layout per spec 17.5: top bar (name, Live badge, viewers), player card, **current bid** numerals that slide up and flash amber 400 ms on a new bid, **Bid button** showing the next valid amount, my team strip (purse, squad, reserve needed), bid history (last 8), tabs Teams / Sold / Upcoming.
- [ ] Bid button logic: label `Bid <amount>` using `next_bid_amount`; click calls `place_bid(lot, expected_amount)`; disabled while in flight; states and exact reasons: "Bidding is closed", "You're the highest bidder", "Not enough purse", "Squad is full", "Auction paused", "Reconnecting...". On `bid_changed` show "Someone bid first. The current bid is <n>." and refresh the amount. **Never fake success.**
- [ ] Watchlist stars from F3 highlighted; "You're up" highlight for the player whose lot is on the block.
- [ ] Spectators and players see "Watching live" in place of the bid button.
- [ ] `aria-live="polite"` announcements: "New bid, Falcons, 120 points", "Sold to Lions for 150 points".
- [ ] Desktop expands to two columns.
- [ ] The route is dynamically imported/client-only; no heavy libraries.

### 9.5 Auction prep hub (F3)
- [ ] Purse card (total, spent, remaining, **reserve needed**), squad requirements grid (category limits and minimum roles), pool browser with filters and **watchlist** (stored in a small `localStorage`/or a table if you add a migration), private notes per player, auction date with countdown and **Enter auction room** enabled 15 minutes before start. After the auction shows the squad bought.

### 9.6 Chat
- [ ] Chat component (B2 Chat tab): last 30 messages, keyset load of older ones, own messages aligned right with tint, role badges, date separators, "New messages" pill when scrolled up, composer (500 chars, counter near limit, Enter to send, emoji picker), `@mentions` list (notify mentioned members through `notifications`).
- [ ] Send via `post_chat_message`; show `muted`, `slow_mode`, `not_a_member` states. Realtime through Postgres Changes filtered by `tournament_id` with RLS.
- [ ] Moderation (organizer): delete message (`delete_chat_message`), mute 1 hour / 1 day / rest of tournament (`mute_chat_user`), pin via announcements; any member can report (`report_content`).
- [ ] Empty and muted states per spec 18.4. Feature flag `flags.chat`.

### 9.7 Live strip and notifications
- [ ] Wire `LiveStrip` (Plan 2) under the header: shows a live auction or match in the user's city; query is cached 30 s; dismissible per session.
- [ ] Notification events for auction scheduled / starts in 15 min / live now / sold / completed; match reminders (1 day and 2 hours before): implement as a scheduled Edge Function `send-reminders` (add as a new numbered migration for `matches.reminded_24h`, `reminded_2h` flags if needed) plus emails via `send-email`. Respect notification settings.

## Acceptance criteria
- [ ] 16 managers bid in the same second on one lot: exactly one wins per bid step; losers see `bid_changed`; purse math is exact; no duplicate squad rows.
- [ ] A bid appears on a second device within 1 second; killing the network on a manager's phone shows "Reconnecting...", and the state is correct after reconnect.
- [ ] Reserve rule, purse, squad max, and category limit rejections show the right messages.
- [ ] Undo last bid restores the previous holder and amount for everyone; every undo is in `audit_log`.
- [ ] Console closed mid-auction and reopened resumes correctly.
- [ ] 300 spectators watching adds no presence traffic; CPU/DB load stays within Plan 10 thresholds.
- [ ] Screen reader announces bids and sales.
- [ ] Chat: slow mode, mute, delete, report all work; non-members cannot read or write.
- [ ] Playwright: two-browser auction scenario (organizer + two managers) from lock pool to end auction.

**Out of scope:** private chats, images in chat, auto-timer auctions, RTM cards (not in v1).
