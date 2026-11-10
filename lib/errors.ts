export const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in to continue.",
  profile_incomplete: "Please complete your profile onboarding first.",
  registration_closed: "Registration is closed for this tournament.",
  city_mismatch: "This tournament is in a different city than your profile city.",
  subscription_required: "An active player subscription is required to apply.",
  already_applied: "You have already applied to this tournament.",
  already_in_squad: "You are already a member of a squad in this tournament.",
  pool_full: "The player pool has reached its maximum capacity.",
  pool_locked: "The player pool is locked and cannot be modified.",
  applications_disabled: "Applications are currently closed.",
  forbidden: "You do not have permission to perform this action.",
  not_found: "The requested item was not found.",
  invalid_status: "This action is not allowed in the current status.",
  invalid_decision: "Invalid review decision provided.",
  already_reviewed: "This application has already been reviewed.",
  payment_required: "Tournament fee must be paid before publishing.",
  tournament_incomplete: "Tournament details are incomplete.",
  invite_invalid: "That invite link is invalid or has expired.",
  already_manager_in_tournament: "You already manage a team in this tournament.",
  team_has_manager: "This team already has an assigned manager.",
  tournament_full: "The tournament has reached its maximum number of teams.",
  team_name_or_manager_exists: "A team with this name or manager already exists in this tournament.",
  team_applications_disabled: "Team applications are currently disabled.",
  invalid_name: "Please enter a valid name.",
  squad_full: "This squad is already full.",
  squad_locked: "This squad is locked and changes can no longer be made.",
  squad_too_small: "The squad does not meet the minimum number of players.",
  squads_incomplete: "One or more squads do not meet the minimum requirements.",
  player_already_in_a_team: "This player is already assigned to a team.",
  jersey_taken: "That jersey number is already taken by another player on this team.",
  not_direct_mode: "This action is only supported in direct squad selection mode.",
  team_not_approved: "This team has not been approved yet.",
  squad_changes_closed: "Squad adjustments are now closed.",
  auction_squad_locked: "Auction squads are locked.",
  no_pricing_tier_for_team_count: "No pricing tier matches the selected team count.",
  auction_not_live: "The auction is not currently live.",
  auction_paused: "The auction is paused. Bidding will resume shortly.",
  bidding_closed: "Bidding is closed for this player.",
  lot_already_on_block: "A player is already on the auction block.",
  lot_not_available: "This player is not available for auction.",
  lot_not_on_block: "This player is not currently on the auction block.",
  no_bids: "No bids have been placed yet.",
  no_bid_to_undo: "There is no bid available to undo.",
  lot_on_block: "There is already a player on the auction block.",
  not_a_bidder: "You are not registered as an active bidder.",
  already_highest: "You already hold the highest bid.",
  insufficient_purse: "You do not have enough purse points to place this bid.",
  category_limit: "Your team has reached the maximum allowed players for this category.",
  reserve_rule: "This bid would leave too few points to fill your minimum squad.",
  bid_changed: "Another bid was placed at the same time. Check the updated amount.",
  pool_not_locked: "Player pool must be locked before starting the auction.",
  pool_empty: "The player pool has no approved players.",
  registration_must_be_closed: "Registration must be closed before locking the pool.",
  need_two_teams: "At least two approved teams are required.",
  teams_without_manager: "All approved teams must have an assigned manager.",
  auction_not_completed: "The auction must be completed first.",
  auction_not_configured: "Auction settings have not been configured.",
  not_auction_mode: "This tournament does not use auction mode.",
  fixtures_not_published: "Fixtures have not been published yet.",
  teams_not_set: "Teams have not been assigned to this match.",
  result_required: "Match result details are required.",
  winner_required: "A winner must be designated for this match.",
  next_match_already_played: "The next round match has already been played.",
  not_a_member: "You must be a tournament participant to send messages.",
  muted: "You have been temporarily muted in this chat.",
  slow_mode: "Slow mode is active. Please wait 3 seconds between messages.",
  invalid_message: "Message must be between 1 and 500 characters.",
  cannot_mute_self: "You cannot mute yourself.",
  reason_required: "A reason is required for this action.",
  cannot_reopen: "Tournament registration cannot be reopened.",
  cannot_withdraw: "Applications cannot be withdrawn once locked or assigned to a squad.",
  city_not_found: "The selected city was not found.",
  player_not_found: "Player not found.",
  invalid_kind: "Invalid tournament or fixture format.",
};

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Try again.";

export function getErrorMessage(rawCodeOrMessage?: string | null): string {
  if (!rawCodeOrMessage) {
    return DEFAULT_ERROR_MESSAGE;
  }

  const trimmed = rawCodeOrMessage.trim();

  // Handle dynamic error patterns
  if (trimmed.startsWith("locked_field:")) {
    return "This field cannot be changed after payment or publishing.";
  }

  // Exact match in error dictionary
  if (trimmed in ERROR_MESSAGES) {
    return ERROR_MESSAGES[trimmed];
  }

  // Check if message contains one of the known codes
  for (const [code, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (trimmed.includes(code)) {
      return friendly;
    }
  }

  return DEFAULT_ERROR_MESSAGE;
}
