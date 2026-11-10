/** Friendly text for place_bid rejections. `bid_changed` is special-cased by the UI. */
export const BID_ERRORS: Record<string, string> = {
  bidding_closed: "Bidding is closed.",
  auction_paused: "The auction is paused.",
  not_a_bidder: "Only team managers in this tournament can bid.",
  already_highest: "You're the highest bidder.",
  insufficient_purse: "Not enough purse for this bid.",
  squad_full: "Your squad is full.",
  category_limit: "You've reached the limit for this player's category.",
  reserve_rule: "This bid would leave too little purse to fill your minimum squad.",
  not_authenticated: "Please log in to bid.",
  bid_changed: "Someone bid first.",
};

export function bidErrorMessage(code: string): string {
  return BID_ERRORS[code] ?? "Your bid couldn't be placed. Please try again.";
}
