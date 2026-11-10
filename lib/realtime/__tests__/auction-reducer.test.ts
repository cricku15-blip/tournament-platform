import { describe, expect, it } from "vitest";
import { applySnapshot, bidBlockReason, initialState, reduce, type AuctionEvent, type AuctionState } from "../auction-reducer";

const sel = (id = "L1"): AuctionEvent => ({ type: "lot_selected", payload: { lot_id: id, player_id: "P1", player_name: "Ravi", category: "Batter", base_price: 20, next_bid: 20 } });
const bid = (id: string, amount: number, team = "T1", name = "Falcons"): AuctionEvent => ({ type: "bid_placed", payload: { lot_id: "L1", bid_id: id, team_id: team, team_name: name, amount, next_bid: amount + 5 } });
const run = (events: AuctionEvent[], from: AuctionState = { ...initialState, status: "live", purses: { T1: { name: "Falcons", total: 1000, spent: 0, squad: 0 }, T2: { name: "Lions", total: 1000, spent: 0, squad: 0 } } }) => events.reduce(reduce, from);

describe("auction reducer", () => {
  it("selects a lot and opens bidding", () => {
    const s = run([sel(), { type: "bidding_opened", payload: { lot_id: "L1", next_bid: 20 } }]);
    expect(s.lot?.biddingOpen).toBe(true);
    expect(s.lot?.playerName).toBe("Ravi");
  });

  it("applies bids in order and keeps only the last 8", () => {
    const events: AuctionEvent[] = [sel()];
    for (let i = 1; i <= 10; i++) events.push(bid(`b${i}`, 20 + i * 5));
    const s = run(events);
    expect(s.lot?.currentBid).toBe(70);
    expect(s.bids).toHaveLength(8);
    expect(s.bids[0].id).toBe("b10");
  });

  it("ignores duplicate bid events", () => {
    const s = run([sel(), bid("b1", 25), bid("b1", 25)]);
    expect(s.bids).toHaveLength(1);
  });

  it("ignores an out-of-order older bid", () => {
    const s = run([sel(), bid("b2", 30, "T2", "Lions"), bid("b1", 25)]);
    expect(s.lot?.currentBid).toBe(30);
    expect(s.lot?.currentTeamName).toBe("Lions");
    expect(s.bids).toHaveLength(1);
  });

  it("ignores events for a lot that is not on the block", () => {
    const s = run([bid("b1", 25)]);
    expect(s.lot).toBeNull();
    expect(s.bids).toHaveLength(0);
  });

  it("undo restores the previous holder and amount", () => {
    const s = run([sel(), bid("b1", 25, "T1", "Falcons"), bid("b2", 30, "T2", "Lions"), { type: "bid_undone", payload: { lot_id: "L1", bid_id: "b2", current_bid: 25, team_id: "T1", next_bid: 30 } }]);
    expect(s.lot?.currentBid).toBe(25);
    expect(s.lot?.currentTeamName).toBe("Falcons");
    expect(s.bids.map((b) => b.id)).toEqual(["b1"]);
  });

  it("undoing the only bid clears the holder", () => {
    const s = run([sel(), bid("b1", 25), { type: "bid_undone", payload: { lot_id: "L1", bid_id: "b1", current_bid: null, team_id: null, next_bid: 20 } }]);
    expect(s.lot?.currentBid).toBeNull();
    expect(s.lot?.currentTeamId).toBeNull();
  });

  it("sold updates purse once even if the event repeats", () => {
    const sold: AuctionEvent = { type: "lot_sold", payload: { lot_id: "L1", player_id: "P1", team_id: "T1", team_name: "Falcons", price: 120 } };
    const s = run([sel(), bid("b1", 120), sold, sold], { ...initialState, status: "live", counts: { upcoming: 5, sold: 0, unsold: 0 }, purses: { T1: { name: "Falcons", total: 1000, spent: 0, squad: 0 } } });
    expect(s.purses.T1.spent).toBe(120);
    expect(s.purses.T1.squad).toBe(1);
    expect(s.counts).toEqual({ upcoming: 4, sold: 1, unsold: 0 });
    expect(s.lot).toBeNull();
    expect(s.lastResult).toEqual({ kind: "sold", playerName: "Ravi", teamName: "Falcons", price: 120 });
    expect(s.liveMessage).toBe("Sold to Falcons for 120 points");
  });

  it("a late duplicate lot_selected after the lot closed is ignored", () => {
    const s = run([sel(), { type: "lot_unsold", payload: { lot_id: "L1", player_id: "P1" } }, sel()]);
    expect(s.lot).toBeNull();
    expect(s.counts.unsold).toBe(1);
  });

  it("pause, resume and end", () => {
    expect(run([{ type: "auction_paused", payload: {} }]).status).toBe("paused");
    expect(run([{ type: "auction_paused", payload: {} }, { type: "auction_resumed", payload: {} }]).status).toBe("live");
    const ended = run([sel(), { type: "auction_ended", payload: {} }]);
    expect(ended.status).toBe("completed");
    expect(ended.lot).toBeNull();
  });

  it("going once and twice only for the current lot", () => {
    expect(run([sel(), { type: "going_once", payload: { lot_id: "L1" } }]).announcement).toBe("going_once");
    expect(run([sel(), { type: "going_twice", payload: { lot_id: "OTHER" } }]).announcement).toBeNull();
  });

  it("the snapshot overrides event state", () => {
    const drifted = run([sel(), bid("b1", 25)]);
    const s = applySnapshot(drifted, { status: "live", lot: { id: "L1", playerId: "P1", playerName: "Ravi", category: "Batter", basePrice: 20, biddingOpen: true, currentBid: 40, currentTeamId: "T2", currentTeamName: "Lions", nextBid: 45 }, purses: drifted.purses, bids: [{ id: "b9", teamId: "T2", teamName: "Lions", amount: 40 }], counts: { upcoming: 3, sold: 1, unsold: 0 } });
    expect(s.lot?.currentBid).toBe(40);
    expect(s.bids).toHaveLength(1);
    expect(s.closedLots).toEqual([]);
  });
});

describe("bidBlockReason", () => {
  const lot = { id: "L1", playerId: "P", playerName: "R", category: null, basePrice: 20, biddingOpen: true, currentBid: 100, currentTeamId: "T2", currentTeamName: "Lions", nextBid: 105 };
  const base = { connected: true, status: "live" as const, lot, myTeamId: "T1", purse: { total: 1000, spent: 0, squad: 3 }, squadMax: 11, inFlight: false };
  it("returns the exact reasons in priority order", () => {
    expect(bidBlockReason({ ...base, connected: false })).toBe("Reconnecting...");
    expect(bidBlockReason({ ...base, status: "paused" })).toBe("Auction paused");
    expect(bidBlockReason({ ...base, lot: { ...lot, biddingOpen: false } })).toBe("Bidding is closed");
    expect(bidBlockReason({ ...base, lot: { ...lot, currentTeamId: "T1" } })).toBe("You're the highest bidder");
    expect(bidBlockReason({ ...base, inFlight: true })).toBe("Placing bid...");
    expect(bidBlockReason({ ...base, purse: { total: 100, spent: 50, squad: 3 } })).toBe("Not enough purse");
    expect(bidBlockReason({ ...base, purse: { total: 1000, spent: 0, squad: 11 } })).toBe("Squad is full");
    expect(bidBlockReason(base)).toBeNull();
  });
});
