export type AuctionStatus = "not_scheduled" | "scheduled" | "live" | "paused" | "completed";

export interface Lot {
  id: string;
  playerId: string;
  playerName: string;
  category: string | null;
  basePrice: number;
  biddingOpen: boolean;
  currentBid: number | null;
  currentTeamId: string | null;
  currentTeamName: string | null;
  nextBid: number;
}

export interface BidItem {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
}

export interface PurseInfo {
  name: string;
  total: number;
  spent: number;
  squad: number;
}

export interface LastResult {
  kind: "sold" | "unsold";
  playerName: string;
  teamName?: string;
  price?: number;
}

export interface AuctionState {
  status: AuctionStatus;
  lot: Lot | null;
  purses: Record<string, PurseInfo>;
  bids: BidItem[]; // newest first, at most 8
  counts: { upcoming: number; sold: number; unsold: number };
  announcement: "going_once" | "going_twice" | null;
  lastResult: LastResult | null;
  /** Lots already closed by an event, so a duplicate `lot_sold` can't double count spending. */
  closedLots: string[];
  /** Short text for aria-live regions. Changes on every meaningful event. */
  liveMessage: string;
}

export interface Snapshot {
  status: AuctionStatus;
  lot: Lot | null;
  purses: Record<string, PurseInfo>;
  bids: BidItem[];
  counts: { upcoming: number; sold: number; unsold: number };
}

export type AuctionEvent =
  | { type: "lot_selected"; payload: { lot_id: string; player_id: string; player_name: string; category: string | null; base_price: number; next_bid: number } }
  | { type: "bidding_opened"; payload: { lot_id: string; next_bid: number } }
  | { type: "bid_placed"; payload: { lot_id: string; bid_id: string; team_id: string; team_name: string; amount: number; next_bid: number } }
  | { type: "bid_undone"; payload: { lot_id: string; bid_id: string; current_bid: number | null; team_id: string | null; next_bid: number } }
  | { type: "going_once" | "going_twice"; payload: { lot_id: string } }
  | { type: "lot_sold"; payload: { lot_id: string; player_id: string; team_id: string; team_name: string; price: number } }
  | { type: "lot_unsold"; payload: { lot_id: string; player_id: string } }
  | { type: "auction_started" | "auction_resumed" | "auction_paused" | "auction_ended"; payload: Record<string, unknown> };

export const initialState: AuctionState = {
  status: "not_scheduled",
  lot: null,
  purses: {},
  bids: [],
  counts: { upcoming: 0, sold: 0, unsold: 0 },
  announcement: null,
  lastResult: null,
  closedLots: [],
  liveMessage: "",
};

const MAX_BIDS = 8;

/** The database always wins: a snapshot replaces everything except the transient banner state. */
export function applySnapshot(s: AuctionState, snap: Snapshot): AuctionState {
  return {
    ...s,
    status: snap.status,
    lot: snap.lot,
    purses: snap.purses,
    bids: snap.bids.slice(0, MAX_BIDS),
    counts: snap.counts,
    announcement: snap.lot && snap.lot.id === s.lot?.id ? s.announcement : null,
    closedLots: [],
  };
}

/** Pure, order-tolerant and idempotent. Anything that does not fit the current lot is ignored; the next resync repairs it. */
export function reduce(s: AuctionState, e: AuctionEvent): AuctionState {
  switch (e.type) {
    case "lot_selected": {
      const p = e.payload;
      if (s.lot?.id === p.lot_id) return s; // duplicate
      if (s.closedLots.includes(p.lot_id)) return s; // a late copy of an already closed lot
      return {
        ...s,
        lot: { id: p.lot_id, playerId: p.player_id, playerName: p.player_name, category: p.category, basePrice: p.base_price, biddingOpen: false, currentBid: null, currentTeamId: null, currentTeamName: null, nextBid: p.next_bid },
        bids: [],
        announcement: null,
        lastResult: null,
        liveMessage: `${p.player_name} is on the block. Base price ${p.base_price} points.`,
      };
    }
    case "bidding_opened": {
      if (!s.lot || s.lot.id !== e.payload.lot_id) return s;
      return { ...s, lot: { ...s.lot, biddingOpen: true, nextBid: e.payload.next_bid }, liveMessage: "Bidding is open." };
    }
    case "bid_placed": {
      const p = e.payload;
      if (!s.lot || s.lot.id !== p.lot_id) return s;
      if (s.bids.some((b) => b.id === p.bid_id)) return s; // duplicate
      if (s.lot.currentBid !== null && p.amount <= s.lot.currentBid) return s; // out of order: a newer bid already applied
      return {
        ...s,
        lot: { ...s.lot, currentBid: p.amount, currentTeamId: p.team_id, currentTeamName: p.team_name, nextBid: p.next_bid },
        bids: [{ id: p.bid_id, teamId: p.team_id, teamName: p.team_name, amount: p.amount }, ...s.bids].slice(0, MAX_BIDS),
        announcement: null,
        liveMessage: `New bid, ${p.team_name}, ${p.amount} points`,
      };
    }
    case "bid_undone": {
      const p = e.payload;
      if (!s.lot || s.lot.id !== p.lot_id) return s;
      const bids = s.bids.filter((b) => b.id !== p.bid_id);
      const holder = p.team_id ? (bids.find((b) => b.teamId === p.team_id)?.teamName ?? s.purses[p.team_id]?.name ?? null) : null;
      return {
        ...s,
        lot: { ...s.lot, currentBid: p.current_bid, currentTeamId: p.team_id, currentTeamName: holder, nextBid: p.next_bid },
        bids,
        liveMessage: p.current_bid === null ? "The last bid was undone. There are no bids." : `Last bid undone. Current bid ${p.current_bid} points.`,
      };
    }
    case "going_once":
    case "going_twice": {
      if (!s.lot || s.lot.id !== e.payload.lot_id) return s;
      return { ...s, announcement: e.type, liveMessage: e.type === "going_once" ? "Going once" : "Going twice" };
    }
    case "lot_sold": {
      const p = e.payload;
      if (s.closedLots.includes(p.lot_id)) return s; // duplicate
      const name = s.lot?.id === p.lot_id ? s.lot.playerName : "Player";
      const purses = { ...s.purses };
      const t = purses[p.team_id];
      if (t) purses[p.team_id] = { ...t, spent: t.spent + p.price, squad: t.squad + 1 };
      return {
        ...s,
        lot: s.lot?.id === p.lot_id ? null : s.lot,
        purses,
        bids: s.lot?.id === p.lot_id ? [] : s.bids,
        announcement: null,
        counts: { ...s.counts, sold: s.counts.sold + 1, upcoming: Math.max(0, s.counts.upcoming - 1) },
        lastResult: { kind: "sold", playerName: name, teamName: p.team_name, price: p.price },
        closedLots: [...s.closedLots, p.lot_id],
        liveMessage: `Sold to ${p.team_name} for ${p.price} points`,
      };
    }
    case "lot_unsold": {
      const p = e.payload;
      if (s.closedLots.includes(p.lot_id)) return s;
      const name = s.lot?.id === p.lot_id ? s.lot.playerName : "Player";
      return {
        ...s,
        lot: s.lot?.id === p.lot_id ? null : s.lot,
        bids: s.lot?.id === p.lot_id ? [] : s.bids,
        announcement: null,
        counts: { ...s.counts, unsold: s.counts.unsold + 1, upcoming: Math.max(0, s.counts.upcoming - 1) },
        lastResult: { kind: "unsold", playerName: name },
        closedLots: [...s.closedLots, p.lot_id],
        liveMessage: `${name} went unsold`,
      };
    }
    case "auction_started":
      return { ...s, status: "live", liveMessage: "The auction has started." };
    case "auction_paused":
      return { ...s, status: "paused", liveMessage: "The auction is paused." };
    case "auction_resumed":
      return { ...s, status: "live", liveMessage: "The auction has resumed." };
    case "auction_ended":
      return { ...s, status: "completed", lot: null, announcement: null, liveMessage: "The auction has ended." };
    default:
      return s;
  }
}

export interface BidButtonInput {
  connected: boolean;
  status: AuctionStatus;
  lot: Lot | null;
  myTeamId: string | null;
  purse: { total: number; spent: number; squad: number } | null;
  squadMax: number | null;
  inFlight: boolean;
}

/** Why the bid button is disabled (the server still enforces everything). Null means the button is usable. */
export function bidBlockReason(i: BidButtonInput): string | null {
  if (!i.connected) return "Reconnecting...";
  if (i.status === "paused") return "Auction paused";
  if (i.status !== "live" || !i.lot || !i.lot.biddingOpen) return "Bidding is closed";
  if (!i.myTeamId) return null;
  if (i.lot.currentTeamId === i.myTeamId) return "You're the highest bidder";
  if (i.inFlight) return "Placing bid...";
  if (i.purse && i.lot.nextBid > i.purse.total - i.purse.spent) return "Not enough purse";
  if (i.squadMax !== null && i.purse && i.purse.squad >= i.squadMax) return "Squad is full";
  return null;
}
