
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"id": string,"is_pinned": boolean,"title": string,"tournament_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_pinned"?: boolean,"title": string,"tournament_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_pinned"?: boolean,"title"?: string,"tournament_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"auction_events": {
                  Row: {
                    "created_at": string,"id": number,"payload": NonNullable<Json>,"tournament_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"tournament_id": string,"type": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"tournament_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auction_events_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_events_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"auction_lots": {
                  Row: {
                    "bidding_open": boolean,"closed_at": string | null,"created_at": string,"current_bid": number | null,"current_team_id": string | null,"id": string,"opened_at": string | null,"player_id": string,"sold_price": number | null,"sold_team_id": string | null,"status": Database["public"]['Enums']["lot_status"],"tournament_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bidding_open"?: boolean,"closed_at"?: string | null,"created_at"?: string,"current_bid"?: number | null,"current_team_id"?: string | null,"id"?: string,"opened_at"?: string | null,"player_id": string,"sold_price"?: number | null,"sold_team_id"?: string | null,"status"?: Database["public"]['Enums']["lot_status"],"tournament_id": string,"updated_at"?: string
                  }
                  Update: {
                    "bidding_open"?: boolean,"closed_at"?: string | null,"created_at"?: string,"current_bid"?: number | null,"current_team_id"?: string | null,"id"?: string,"opened_at"?: string | null,"player_id"?: string,"sold_price"?: number | null,"sold_team_id"?: string | null,"status"?: Database["public"]['Enums']["lot_status"],"tournament_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auction_lots_current_team_id_fkey"
      columns: ["current_team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_current_team_id_fkey"
      columns: ["current_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_sold_team_id_fkey"
      columns: ["sold_team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_sold_team_id_fkey"
      columns: ["sold_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_lots_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"auction_settings": {
                  Row: {
                    "base_prices": NonNullable<Json>,"categories": NonNullable<Json>,"category_limits": NonNullable<Json>,"created_at": string,"increment_slabs": NonNullable<Json>,"mode": string,"pool_locked": boolean,"purse": number,"reminded_15m": boolean,"reserve_rule": boolean,"scheduled_at": string | null,"sequence_mode": string,"status": Database["public"]['Enums']["auction_status"],"tournament_id": string,"unsold_round": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_prices"?: NonNullable<Json>,"categories"?: NonNullable<Json>,"category_limits"?: NonNullable<Json>,"created_at"?: string,"increment_slabs"?: NonNullable<Json>,"mode"?: string,"pool_locked"?: boolean,"purse"?: number,"reminded_15m"?: boolean,"reserve_rule"?: boolean,"scheduled_at"?: string | null,"sequence_mode"?: string,"status"?: Database["public"]['Enums']["auction_status"],"tournament_id": string,"unsold_round"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "base_prices"?: NonNullable<Json>,"categories"?: NonNullable<Json>,"category_limits"?: NonNullable<Json>,"created_at"?: string,"increment_slabs"?: NonNullable<Json>,"mode"?: string,"pool_locked"?: boolean,"purse"?: number,"reminded_15m"?: boolean,"reserve_rule"?: boolean,"scheduled_at"?: string | null,"sequence_mode"?: string,"status"?: Database["public"]['Enums']["auction_status"],"tournament_id"?: string,"unsold_round"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auction_settings_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: true
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auction_settings_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: true
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"id": number,"reason": string | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: never,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: never,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"bids": {
                  Row: {
                    "amount": number,"id": string,"is_undone": boolean,"lot_id": string,"placed_at": string,"placed_by": string | null,"team_id": string,"tournament_id": string,"undo_reason": string | null,"undone_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"id"?: string,"is_undone"?: boolean,"lot_id": string,"placed_at"?: string,"placed_by"?: string | null,"team_id": string,"tournament_id": string,"undo_reason"?: string | null,"undone_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"id"?: string,"is_undone"?: boolean,"lot_id"?: string,"placed_at"?: string,"placed_by"?: string | null,"team_id"?: string,"tournament_id"?: string,"undo_reason"?: string | null,"undone_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bids_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "auction_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_placed_by_fkey"
      columns: ["placed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_placed_by_fkey"
      columns: ["placed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_undone_by_fkey"
      columns: ["undone_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_undone_by_fkey"
      columns: ["undone_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_messages": {
                  Row: {
                    "body": string,"created_at": string,"deleted_by": string | null,"id": string,"is_deleted": boolean,"reply_to": string | null,"tournament_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"deleted_by"?: string | null,"id"?: string,"is_deleted"?: boolean,"reply_to"?: string | null,"tournament_id": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"deleted_by"?: string | null,"id"?: string,"is_deleted"?: boolean,"reply_to"?: string | null,"tournament_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_messages_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_reply_to_fkey"
      columns: ["reply_to"]
isOneToOne: false
      referencedRelation: "chat_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_mutes": {
                  Row: {
                    "created_at": string,"id": string,"muted_by": string | null,"muted_until": string,"tournament_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"muted_by"?: string | null,"muted_until": string,"tournament_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"muted_by"?: string | null,"muted_until"?: string,"tournament_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_mutes_muted_by_fkey"
      columns: ["muted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_mutes_muted_by_fkey"
      columns: ["muted_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_mutes_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_mutes_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_mutes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_mutes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"state": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"state"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"state"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"city_requests": {
                  Row: {
                    "city_name": string,"created_at": string,"email": string | null,"id": string,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city_name": string,"created_at"?: string,"email"?: string | null,"id"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "city_name"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "city_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "city_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"message": string,"name": string,"status": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"message": string,"name": string,"status"?: string,"topic": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"message"?: string,"name"?: string,"status"?: string,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cricket_batting": {
                  Row: {
                    "balls": number,"bowler_id": string | null,"dismissal": string | null,"fielder_id": string | null,"fours": number,"id": string,"innings": number,"match_id": string,"player_id": string,"runs": number,"sixes": number,"team_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "balls"?: number,"bowler_id"?: string | null,"dismissal"?: string | null,"fielder_id"?: string | null,"fours"?: number,"id"?: string,"innings": number,"match_id": string,"player_id": string,"runs"?: number,"sixes"?: number,"team_id"?: string | null
                  }
                  Update: {
                    "balls"?: number,"bowler_id"?: string | null,"dismissal"?: string | null,"fielder_id"?: string | null,"fours"?: number,"id"?: string,"innings"?: number,"match_id"?: string,"player_id"?: string,"runs"?: number,"sixes"?: number,"team_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cricket_batting_bowler_id_fkey"
      columns: ["bowler_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_bowler_id_fkey"
      columns: ["bowler_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_fielder_id_fkey"
      columns: ["fielder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_fielder_id_fkey"
      columns: ["fielder_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"cricket_bowling": {
                  Row: {
                    "balls_bowled": number,"id": string,"innings": number,"maidens": number,"match_id": string,"no_balls": number,"player_id": string,"runs": number,"team_id": string | null,"wickets": number,"wides": number
                  }
                  ComputedFields: never
                  Insert: {
                    "balls_bowled"?: number,"id"?: string,"innings": number,"maidens"?: number,"match_id": string,"no_balls"?: number,"player_id": string,"runs"?: number,"team_id"?: string | null,"wickets"?: number,"wides"?: number
                  }
                  Update: {
                    "balls_bowled"?: number,"id"?: string,"innings"?: number,"maidens"?: number,"match_id"?: string,"no_balls"?: number,"player_id"?: string,"runs"?: number,"team_id"?: string | null,"wickets"?: number,"wides"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cricket_bowling_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_bowling_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_bowling_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_bowling_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_bowling_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"cricket_fielding": {
                  Row: {
                    "catches": number,"id": string,"match_id": string,"player_id": string,"run_outs": number,"stumpings": number
                  }
                  ComputedFields: never
                  Insert: {
                    "catches"?: number,"id"?: string,"match_id": string,"player_id": string,"run_outs"?: number,"stumpings"?: number
                  }
                  Update: {
                    "catches"?: number,"id"?: string,"match_id"?: string,"player_id"?: string,"run_outs"?: number,"stumpings"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cricket_fielding_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_fielding_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_fielding_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"football_events": {
                  Row: {
                    "assist_player_id": string | null,"id": string,"match_id": string,"meta": NonNullable<Json>,"minute": number | null,"player_id": string | null,"team_id": string | null,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assist_player_id"?: string | null,"id"?: string,"match_id": string,"meta"?: NonNullable<Json>,"minute"?: number | null,"player_id"?: string | null,"team_id"?: string | null,"type": string
                  }
                  Update: {
                    "assist_player_id"?: string | null,"id"?: string,"match_id"?: string,"meta"?: NonNullable<Json>,"minute"?: number | null,"player_id"?: string | null,"team_id"?: string | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "football_events_assist_player_id_fkey"
      columns: ["assist_player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_events_assist_player_id_fkey"
      columns: ["assist_player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_events_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_events_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_events_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_events_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_events_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"football_lineups": {
                  Row: {
                    "id": string,"is_starter": boolean,"match_id": string,"player_id": string,"position": string | null,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_starter"?: boolean,"match_id": string,"player_id": string,"position"?: string | null,"team_id": string
                  }
                  Update: {
                    "id"?: string,"is_starter"?: boolean,"match_id"?: string,"player_id"?: string,"position"?: string | null,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "football_lineups_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_lineups_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_lineups_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_lineups_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "football_lineups_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"fixture_published": boolean,"group_no": number | null,"id": string,"label_a": string | null,"label_b": string | null,"loser_next_match_id": string | null,"loser_next_slot": string | null,"match_no": number | null,"next_match_id": string | null,"next_slot": string | null,"notes": string | null,"player_of_match_id": string | null,"reminded_24h": boolean,"reminded_2h": boolean,"result_published_at": string | null,"result_text": string | null,"result_type": string | null,"round_no": number | null,"scheduled_at": string | null,"score_a": NonNullable<Json>,"score_b": NonNullable<Json>,"stage": string,"status": Database["public"]['Enums']["match_status"],"team_a_id": string | null,"team_b_id": string | null,"toss": Json | null,"tournament_id": string,"updated_at": string,"venue": string | null,"winner_team_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fixture_published"?: boolean,"group_no"?: number | null,"id"?: string,"label_a"?: string | null,"label_b"?: string | null,"loser_next_match_id"?: string | null,"loser_next_slot"?: string | null,"match_no"?: number | null,"next_match_id"?: string | null,"next_slot"?: string | null,"notes"?: string | null,"player_of_match_id"?: string | null,"reminded_24h"?: boolean,"reminded_2h"?: boolean,"result_published_at"?: string | null,"result_text"?: string | null,"result_type"?: string | null,"round_no"?: number | null,"scheduled_at"?: string | null,"score_a"?: NonNullable<Json>,"score_b"?: NonNullable<Json>,"stage"?: string,"status"?: Database["public"]['Enums']["match_status"],"team_a_id"?: string | null,"team_b_id"?: string | null,"toss"?: Json | null,"tournament_id": string,"updated_at"?: string,"venue"?: string | null,"winner_team_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"fixture_published"?: boolean,"group_no"?: number | null,"id"?: string,"label_a"?: string | null,"label_b"?: string | null,"loser_next_match_id"?: string | null,"loser_next_slot"?: string | null,"match_no"?: number | null,"next_match_id"?: string | null,"next_slot"?: string | null,"notes"?: string | null,"player_of_match_id"?: string | null,"reminded_24h"?: boolean,"reminded_2h"?: boolean,"result_published_at"?: string | null,"result_text"?: string | null,"result_type"?: string | null,"round_no"?: number | null,"scheduled_at"?: string | null,"score_a"?: NonNullable<Json>,"score_b"?: NonNullable<Json>,"stage"?: string,"status"?: Database["public"]['Enums']["match_status"],"team_a_id"?: string | null,"team_b_id"?: string | null,"toss"?: Json | null,"tournament_id"?: string,"updated_at"?: string,"venue"?: string | null,"winner_team_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_loser_next_match_id_fkey"
      columns: ["loser_next_match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_next_match_id_fkey"
      columns: ["next_match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_player_of_match_id_fkey"
      columns: ["player_of_match_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_player_of_match_id_fkey"
      columns: ["player_of_match_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_team_a_id_fkey"
      columns: ["team_a_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_team_a_id_fkey"
      columns: ["team_a_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_team_b_id_fkey"
      columns: ["team_b_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_team_b_id_fkey"
      columns: ["team_b_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_winner_team_id_fkey"
      columns: ["winner_team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_winner_team_id_fkey"
      columns: ["winner_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_settings": {
                  Row: {
                    "prefs": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "prefs"?: NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "prefs"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"data": NonNullable<Json>,"id": string,"link": string | null,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_applications": {
                  Row: {
                    "answers": NonNullable<Json>,"contact_phone": string | null,"created_at": string,"details": NonNullable<Json>,"experience": string | null,"id": string,"notes": string | null,"reject_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"role": string | null,"status": Database["public"]['Enums']["application_status"],"tournament_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"contact_phone"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"experience"?: string | null,"id"?: string,"notes"?: string | null,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"role"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"tournament_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"contact_phone"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"experience"?: string | null,"id"?: string,"notes"?: string | null,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"role"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"tournament_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_applications_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_applications_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_plans": {
                  Row: {
                    "amount_paise": number,"benefits": NonNullable<Json>,"created_at": string,"description": string | null,"grace_days": number,"id": string,"is_active": boolean,"name": string,"razorpay_plan_id": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"benefits"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"grace_days"?: number,"id"?: string,"is_active"?: boolean,"name": string,"razorpay_plan_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "amount_paise"?: number,"benefits"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"grace_days"?: number,"id"?: string,"is_active"?: boolean,"name"?: string,"razorpay_plan_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"player_sport_profiles": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"sport_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"sport_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"sport_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_sport_profiles_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_sport_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_sport_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pool_players": {
                  Row: {
                    "base_price": number,"category": string | null,"created_at": string,"id": string,"lot_status": Database["public"]['Enums']["lot_status"],"sequence_no": number | null,"tournament_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price"?: number,"category"?: string | null,"created_at"?: string,"id"?: string,"lot_status"?: Database["public"]['Enums']["lot_status"],"sequence_no"?: number | null,"tournament_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "base_price"?: number,"category"?: string | null,"created_at"?: string,"id"?: string,"lot_status"?: Database["public"]['Enums']["lot_status"],"sequence_no"?: number | null,"tournament_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pool_players_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pool_players_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pool_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pool_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pricing_tiers": {
                  Row: {
                    "amount_paise": number,"created_at": string,"id": string,"is_active": boolean,"max_teams": number,"min_teams": number,"name": string,"sort_order": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"max_teams": number,"min_teams": number,"name": string,"sort_order"?: number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"max_teams"?: number,"min_teams"?: number,"name"?: string,"sort_order"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"city_id": string | null,"created_at": string,"date_of_birth": string | null,"full_name": string | null,"id": string,"is_admin": boolean,"onboarded_at": string | null,"phone": string | null,"show_age": boolean,"show_city": boolean,"show_stats": boolean,"status": Database["public"]['Enums']["user_status"],"suspended_until": string | null,"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"city_id"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"full_name"?: string | null,"id": string,"is_admin"?: boolean,"onboarded_at"?: string | null,"phone"?: string | null,"show_age"?: boolean,"show_city"?: boolean,"show_stats"?: boolean,"status"?: Database["public"]['Enums']["user_status"],"suspended_until"?: string | null,"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"city_id"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"full_name"?: string | null,"id"?: string,"is_admin"?: boolean,"onboarded_at"?: string | null,"phone"?: string | null,"show_age"?: boolean,"show_city"?: boolean,"show_stats"?: boolean,"status"?: Database["public"]['Enums']["user_status"],"suspended_until"?: string | null,"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                },"refunds": {
                  Row: {
                    "created_at": string,"id": string,"payment_id": string,"payment_type": string,"processed_at": string | null,"razorpay_refund_id": string | null,"reason": string | null,"reject_reason": string | null,"requested_by": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["refund_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"payment_id": string,"payment_type": string,"processed_at"?: string | null,"razorpay_refund_id"?: string | null,"reason"?: string | null,"reject_reason"?: string | null,"requested_by"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payment_id"?: string,"payment_type"?: string,"processed_at"?: string | null,"razorpay_refund_id"?: string | null,"reason"?: string | null,"reject_reason"?: string | null,"requested_by"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"reason": string,"reporter_id": string | null,"resolved_by": string | null,"snapshot": NonNullable<Json>,"status": Database["public"]['Enums']["report_status"],"target_id": string | null,"target_type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"reason": string,"reporter_id"?: string | null,"resolved_by"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string | null,"target_type": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"reason"?: string,"reporter_id"?: string | null,"resolved_by"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string | null,"target_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"slug_redirects": {
                  Row: {
                    "created_at": string,"old_slug": string,"tournament_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"old_slug": string,"tournament_id": string
                  }
                  Update: {
                    "created_at"?: string,"old_slug"?: string,"tournament_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "slug_redirects_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "slug_redirects_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"sports": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"id": string,"is_active": boolean,"name": string,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"squad_members": {
                  Row: {
                    "created_at": string,"id": string,"jersey_no": number | null,"price": number | null,"source": Database["public"]['Enums']["squad_source"],"status": string,"team_id": string,"tournament_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"jersey_no"?: number | null,"price"?: number | null,"source"?: Database["public"]['Enums']["squad_source"],"status"?: string,"team_id": string,"tournament_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"jersey_no"?: number | null,"price"?: number | null,"source"?: Database["public"]['Enums']["squad_source"],"status"?: string,"team_id"?: string,"tournament_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_members_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"standings": {
                  Row: {
                    "balls_against": number,"balls_for": number,"drawn": number,"ga": number,"gd": number,"gf": number,"group_no": number | null,"lost": number,"no_result": number,"nrr": number | null,"played": number,"points": number,"position": number | null,"runs_against": number,"runs_for": number,"team_id": string,"tied": number,"tournament_id": string,"updated_at": string,"won": number
                  }
                  ComputedFields: never
                  Insert: {
                    "balls_against"?: number,"balls_for"?: number,"drawn"?: number,"ga"?: number,"gd"?: number,"gf"?: number,"group_no"?: number | null,"lost"?: number,"no_result"?: number,"nrr"?: number | null,"played"?: number,"points"?: number,"position"?: number | null,"runs_against"?: number,"runs_for"?: number,"team_id": string,"tied"?: number,"tournament_id": string,"updated_at"?: string,"won"?: number
                  }
                  Update: {
                    "balls_against"?: number,"balls_for"?: number,"drawn"?: number,"ga"?: number,"gd"?: number,"gf"?: number,"group_no"?: number | null,"lost"?: number,"no_result"?: number,"nrr"?: number | null,"played"?: number,"points"?: number,"position"?: number | null,"runs_against"?: number,"runs_for"?: number,"team_id"?: string,"tied"?: number,"tournament_id"?: string,"updated_at"?: string,"won"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "standings_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "standings_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "standings_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "standings_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"subscription_payments": {
                  Row: {
                    "amount_paise": number,"created_at": string,"id": string,"paid_at": string | null,"razorpay_payment_id": string | null,"receipt_url": string | null,"status": Database["public"]['Enums']["payment_status"],"subscription_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"razorpay_payment_id"?: string | null,"receipt_url"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"subscription_id": string,"user_id": string
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"razorpay_payment_id"?: string | null,"receipt_url"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"subscription_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscription_payments_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "cancel_at_period_end": boolean,"created_at": string,"current_period_end": string | null,"grace_until": string | null,"id": string,"plan_id": string,"razorpay_order_id": string | null,"razorpay_subscription_id": string | null,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"grace_until"?: string | null,"id"?: string,"plan_id": string,"razorpay_order_id"?: string | null,"razorpay_subscription_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"grace_until"?: string | null,"id"?: string,"plan_id"?: string,"razorpay_order_id"?: string | null,"razorpay_subscription_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "player_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_invites": {
                  Row: {
                    "code": string,"created_at": string,"expires_at": string,"id": string,"invited_by": string | null,"status": Database["public"]['Enums']["invite_status"],"team_id": string,"tournament_id": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"status"?: Database["public"]['Enums']["invite_status"],"team_id": string,"tournament_id": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"status"?: Database["public"]['Enums']["invite_status"],"team_id"?: string,"tournament_id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_purses": {
                  Row: {
                    "created_at": string,"spent": number,"team_id": string,"total": number,"tournament_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"spent"?: number,"team_id": string,"total": number,"tournament_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"spent"?: number,"team_id"?: string,"total"?: number,"tournament_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_purses_team_id_fkey"
      columns: ["team_id"]
isOneToOne: true
      referencedRelation: "public_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_purses_team_id_fkey"
      columns: ["team_id"]
isOneToOne: true
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_purses_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_purses_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "color_primary": string | null,"color_secondary": string | null,"created_at": string,"description": string | null,"expected_squad_size": number | null,"group_no": number | null,"home_ground": string | null,"id": string,"logo_url": string | null,"manager_id": string | null,"manager_phone": string | null,"name": string,"notes": string | null,"slug": string,"squad_locked": boolean,"status": Database["public"]['Enums']["team_status"],"tournament_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color_primary"?: string | null,"color_secondary"?: string | null,"created_at"?: string,"description"?: string | null,"expected_squad_size"?: number | null,"group_no"?: number | null,"home_ground"?: string | null,"id"?: string,"logo_url"?: string | null,"manager_id"?: string | null,"manager_phone"?: string | null,"name": string,"notes"?: string | null,"slug": string,"squad_locked"?: boolean,"status"?: Database["public"]['Enums']["team_status"],"tournament_id": string,"updated_at"?: string
                  }
                  Update: {
                    "color_primary"?: string | null,"color_secondary"?: string | null,"created_at"?: string,"description"?: string | null,"expected_squad_size"?: number | null,"group_no"?: number | null,"home_ground"?: string | null,"id"?: string,"logo_url"?: string | null,"manager_id"?: string | null,"manager_phone"?: string | null,"name"?: string,"notes"?: string | null,"slug"?: string,"squad_locked"?: boolean,"status"?: Database["public"]['Enums']["team_status"],"tournament_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_assistants": {
                  Row: {
                    "added_by": string | null,"created_at": string,"tournament_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"tournament_id": string,"user_id": string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"tournament_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_assistants_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_assistants_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_assistants_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_assistants_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_assistants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_assistants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_payments": {
                  Row: {
                    "amount_paise": number,"created_at": string,"currency": string,"failure_reason": string | null,"id": string,"invoice_url": string | null,"kind": string,"organizer_id": string,"paid_at": string | null,"razorpay_order_id": string | null,"razorpay_payment_id": string | null,"status": Database["public"]['Enums']["payment_status"],"target_team_count": number | null,"tax_paise": number,"tier_id": string,"total_paise": number,"tournament_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"currency"?: string,"failure_reason"?: string | null,"id"?: string,"invoice_url"?: string | null,"kind"?: string,"organizer_id": string,"paid_at"?: string | null,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"target_team_count"?: number | null,"tax_paise"?: number,"tier_id": string,"total_paise": number,"tournament_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"currency"?: string,"failure_reason"?: string | null,"id"?: string,"invoice_url"?: string | null,"kind"?: string,"organizer_id"?: string,"paid_at"?: string | null,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"target_team_count"?: number | null,"tax_paise"?: number,"tier_id"?: string,"total_paise"?: number,"tournament_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_payments_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_payments_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_payments_tier_id_fkey"
      columns: ["tier_id"]
isOneToOne: false
      referencedRelation: "pricing_tiers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_payments_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_payments_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournaments": {
                  Row: {
                    "admin_hidden": boolean,"admin_notes": string | null,"advance_per_group": number | null,"allow_player_applications": boolean,"approved_player_count": number,"approved_team_count": number,"banner_url": string | null,"cancelled_reason": string | null,"city_id": string,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"custom_questions": NonNullable<Json>,"description_full": string | null,"description_short": string | null,"end_date": string | null,"entry_fee_info": string | null,"format": Database["public"]['Enums']["tournament_format"],"group_count": number | null,"id": string,"individual_awards": (string)[],"league_legs": number,"logo_url": string | null,"name": string,"organizer_id": string,"player_deadline": string | null,"player_pool_cap": number | null,"playoff_style": string | null,"pricing_tier_id": string | null,"prizes": NonNullable<Json>,"published_at": string | null,"rules": NonNullable<Json>,"rules_text": string | null,"seeding_method": string,"show_contact": boolean,"slug": string,"sport_id": string,"squad_lock_deadline": string | null,"squad_max": number | null,"squad_min": number | null,"squad_mode": Database["public"]['Enums']["squad_mode"],"start_date": string | null,"status": Database["public"]['Enums']["tournament_status"],"team_count": number,"team_deadline": string | null,"team_entry": Database["public"]['Enums']["team_entry"],"third_place_match": boolean,"updated_at": string,"venue_address": string | null,"venue_name": string | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_hidden"?: boolean,"admin_notes"?: string | null,"advance_per_group"?: number | null,"allow_player_applications"?: boolean,"approved_player_count"?: number,"approved_team_count"?: number,"banner_url"?: string | null,"cancelled_reason"?: string | null,"city_id": string,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"custom_questions"?: NonNullable<Json>,"description_full"?: string | null,"description_short"?: string | null,"end_date"?: string | null,"entry_fee_info"?: string | null,"format"?: Database["public"]['Enums']["tournament_format"],"group_count"?: number | null,"id"?: string,"individual_awards"?: (string)[],"league_legs"?: number,"logo_url"?: string | null,"name": string,"organizer_id": string,"player_deadline"?: string | null,"player_pool_cap"?: number | null,"playoff_style"?: string | null,"pricing_tier_id"?: string | null,"prizes"?: NonNullable<Json>,"published_at"?: string | null,"rules"?: NonNullable<Json>,"rules_text"?: string | null,"seeding_method"?: string,"show_contact"?: boolean,"slug": string,"sport_id": string,"squad_lock_deadline"?: string | null,"squad_max"?: number | null,"squad_min"?: number | null,"squad_mode"?: Database["public"]['Enums']["squad_mode"],"start_date"?: string | null,"status"?: Database["public"]['Enums']["tournament_status"],"team_count"?: number,"team_deadline"?: string | null,"team_entry"?: Database["public"]['Enums']["team_entry"],"third_place_match"?: boolean,"updated_at"?: string,"venue_address"?: string | null,"venue_name"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "admin_hidden"?: boolean,"admin_notes"?: string | null,"advance_per_group"?: number | null,"allow_player_applications"?: boolean,"approved_player_count"?: number,"approved_team_count"?: number,"banner_url"?: string | null,"cancelled_reason"?: string | null,"city_id"?: string,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"custom_questions"?: NonNullable<Json>,"description_full"?: string | null,"description_short"?: string | null,"end_date"?: string | null,"entry_fee_info"?: string | null,"format"?: Database["public"]['Enums']["tournament_format"],"group_count"?: number | null,"id"?: string,"individual_awards"?: (string)[],"league_legs"?: number,"logo_url"?: string | null,"name"?: string,"organizer_id"?: string,"player_deadline"?: string | null,"player_pool_cap"?: number | null,"playoff_style"?: string | null,"pricing_tier_id"?: string | null,"prizes"?: NonNullable<Json>,"published_at"?: string | null,"rules"?: NonNullable<Json>,"rules_text"?: string | null,"seeding_method"?: string,"show_contact"?: boolean,"slug"?: string,"sport_id"?: string,"squad_lock_deadline"?: string | null,"squad_max"?: number | null,"squad_min"?: number | null,"squad_mode"?: Database["public"]['Enums']["squad_mode"],"start_date"?: string | null,"status"?: Database["public"]['Enums']["tournament_status"],"team_count"?: number,"team_deadline"?: string | null,"team_entry"?: Database["public"]['Enums']["team_entry"],"third_place_match"?: boolean,"updated_at"?: string,"venue_address"?: string | null,"venue_name"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournaments_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_pricing_tier_id_fkey"
      columns: ["pricing_tier_id"]
isOneToOne: false
      referencedRelation: "pricing_tiers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    }
                  ]
                },"webhook_events": {
                  Row: {
                    "created_at": string,"error": string | null,"event_id": string,"id": string,"payload": Json | null,"processed_at": string | null,"provider": string,"type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"event_id": string,"id"?: string,"payload"?: Json | null,"processed_at"?: string | null,"provider": string,"type"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"event_id"?: string,"id"?: string,"payload"?: Json | null,"processed_at"?: string | null,"provider"?: string,"type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "player_bowling_career": {
                  Row: {
                    "balls_bowled": number | null,"matches": number | null,"player_id": string,"runs_conceded": number | null,"wickets": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cricket_bowling_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_bowling_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_cricket_career": {
                  Row: {
                    "balls": number | null,"fours": number | null,"highest_score": number | null,"matches": number | null,"player_id": string,"runs": number | null,"sixes": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cricket_batting_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_football_career": {
                  Row: {
                    "assists": number | null,"clean_sheets": number | null,"goals": number | null,"matches": number | null,"player_id": string | null,"red_cards": number | null,"yellow_cards": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"public_profiles": {
                  Row: {
                    "age": number | null,"avatar_url": string | null,"bio": string | null,"city_id": string | null,"full_name": string | null,"id": string,"show_stats": boolean,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "age"?: never,"avatar_url"?: string | null,"bio"?: string | null,"city_id"?: never,"full_name"?: string | null,"id"?: string | null,"show_stats"?: boolean | null,"username"?: string | null
                         }
                        Update: {
                           "age"?: never,"avatar_url"?: string | null,"bio"?: string | null,"city_id"?: never,"full_name"?: string | null,"id"?: string | null,"show_stats"?: boolean | null,"username"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"public_teams": {
                  Row: {
                    "color_primary": string | null,"color_secondary": string | null,"description": string | null,"home_ground": string | null,"id": string,"logo_url": string | null,"manager_id": string | null,"name": string,"slug": string,"squad_locked": boolean,"squad_size": number | null,"tournament_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "color_primary"?: string | null,"color_secondary"?: string | null,"description"?: string | null,"home_ground"?: string | null,"id"?: string | null,"logo_url"?: string | null,"manager_id"?: string | null,"name"?: string | null,"slug"?: string | null,"squad_locked"?: boolean | null,"squad_size"?: never,"tournament_id"?: string | null
                         }
                        Update: {
                           "color_primary"?: string | null,"color_secondary"?: string | null,"description"?: string | null,"home_ground"?: string | null,"id"?: string | null,"logo_url"?: string | null,"manager_id"?: string | null,"name"?: string | null,"slug"?: string | null,"squad_locked"?: boolean | null,"squad_size"?: never,"tournament_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "teams_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"public_tournaments": {
                  Row: {
                    "advance_per_group": number | null,"allow_player_applications": boolean,"approved_player_count": number,"approved_team_count": number,"banner_url": string | null,"cancelled_reason": string | null,"city_id": string,"city_name": string,"city_slug": string,"contact_email": string | null,"contact_phone": string | null,"custom_questions": NonNullable<Json>,"description_full": string | null,"description_short": string | null,"end_date": string | null,"entry_fee_info": string | null,"format": Database["public"]['Enums']["tournament_format"],"group_count": number | null,"id": string,"individual_awards": (string)[],"league_legs": number,"logo_url": string | null,"name": string,"organizer_avatar": string | null,"organizer_id": string,"organizer_name": string | null,"player_deadline": string | null,"playoff_style": string | null,"prizes": NonNullable<Json>,"published_at": string | null,"rules": NonNullable<Json>,"rules_text": string | null,"slug": string,"sport_id": string,"sport_name": string,"sport_slug": string,"squad_max": number | null,"squad_min": number | null,"squad_mode": Database["public"]['Enums']["squad_mode"],"start_date": string | null,"status": Database["public"]['Enums']["tournament_status"],"team_count": number,"team_deadline": string | null,"team_entry": Database["public"]['Enums']["team_entry"],"third_place_match": boolean,"venue_address": string | null,"venue_name": string | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "tournaments_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_batting_stats": {
                  Row: {
                    "balls": number | null,"dismissals": number | null,"fours": number | null,"highest_score": number | null,"matches": number | null,"player_id": string,"runs": number | null,"sixes": number | null,"strike_rate": number | null,"tournament_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cricket_batting_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_batting_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_bowling_stats": {
                  Row: {
                    "balls_bowled": number | null,"best_figures": string | null,"economy": number | null,"maidens": number | null,"matches": number | null,"player_id": string,"runs_conceded": number | null,"tournament_id": string,"wickets": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cricket_bowling_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_bowling_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_fielding_stats": {
                  Row: {
                    "catches": number | null,"player_id": string,"run_outs": number | null,"stumpings": number | null,"tournament_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cricket_fielding_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cricket_fielding_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "public_tournaments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_football_stats": {
                  Row: {
                    "assists": number | null,"clean_sheets": number | null,"goals": number | null,"matches": number | null,"player_id": string | null,"red_cards": number | null,"tournament_id": string | null,"yellow_cards": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_auction_event":
{ Args: { "p_payload": Json,"p_tid": string,"p_type": string }; Returns: undefined
                           },
"_audit":
{ Args: { "p_action": string,"p_after": Json,"p_before": Json,"p_reason"?: string,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           },
"_broadcast":
{ Args: { "p_event": string,"p_payload": Json,"p_topic": string }; Returns: undefined
                           },
"_notify":
{ Args: { "p_body"?: string,"p_data"?: Json,"p_link"?: string,"p_title": string,"p_type": string,"p_user": string }; Returns: undefined
                           },
"_notify_members":
{ Args: { "p_body": string,"p_link": string,"p_tid": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"_require_organizer":
{ Args: { "p_tid": string }; Returns: {
              "admin_hidden": boolean,
"admin_notes": string | null,
"advance_per_group": number | null,
"allow_player_applications": boolean,
"approved_player_count": number,
"approved_team_count": number,
"banner_url": string | null,
"cancelled_reason": string | null,
"city_id": string,
"contact_email": string | null,
"contact_phone": string | null,
"created_at": string,
"custom_questions": NonNullable<Json>,
"description_full": string | null,
"description_short": string | null,
"end_date": string | null,
"entry_fee_info": string | null,
"format": Database["public"]['Enums']["tournament_format"],
"group_count": number | null,
"id": string,
"individual_awards": (string)[],
"league_legs": number,
"logo_url": string | null,
"name": string,
"organizer_id": string,
"player_deadline": string | null,
"player_pool_cap": number | null,
"playoff_style": string | null,
"pricing_tier_id": string | null,
"prizes": NonNullable<Json>,
"published_at": string | null,
"rules": NonNullable<Json>,
"rules_text": string | null,
"seeding_method": string,
"show_contact": boolean,
"slug": string,
"sport_id": string,
"squad_lock_deadline": string | null,
"squad_max": number | null,
"squad_min": number | null,
"squad_mode": Database["public"]['Enums']["squad_mode"],
"start_date": string | null,
"status": Database["public"]['Enums']["tournament_status"],
"team_count": number,
"team_deadline": string | null,
"team_entry": Database["public"]['Enums']["team_entry"],
"third_place_match": boolean,
"updated_at": string,
"venue_address": string | null,
"venue_name": string | null,
"visibility": Database["public"]['Enums']["visibility"]
            }
                          SetofOptions: {
        from: "*"
        to: "tournaments"
        isOneToOne: true
        isSetofReturn: false
      } },
"_require_owner":
{ Args: { "p_tid": string }; Returns: {
              "admin_hidden": boolean,
"admin_notes": string | null,
"advance_per_group": number | null,
"allow_player_applications": boolean,
"approved_player_count": number,
"approved_team_count": number,
"banner_url": string | null,
"cancelled_reason": string | null,
"city_id": string,
"contact_email": string | null,
"contact_phone": string | null,
"created_at": string,
"custom_questions": NonNullable<Json>,
"description_full": string | null,
"description_short": string | null,
"end_date": string | null,
"entry_fee_info": string | null,
"format": Database["public"]['Enums']["tournament_format"],
"group_count": number | null,
"id": string,
"individual_awards": (string)[],
"league_legs": number,
"logo_url": string | null,
"name": string,
"organizer_id": string,
"player_deadline": string | null,
"player_pool_cap": number | null,
"playoff_style": string | null,
"pricing_tier_id": string | null,
"prizes": NonNullable<Json>,
"published_at": string | null,
"rules": NonNullable<Json>,
"rules_text": string | null,
"seeding_method": string,
"show_contact": boolean,
"slug": string,
"sport_id": string,
"squad_lock_deadline": string | null,
"squad_max": number | null,
"squad_min": number | null,
"squad_mode": Database["public"]['Enums']["squad_mode"],
"start_date": string | null,
"status": Database["public"]['Enums']["tournament_status"],
"team_count": number,
"team_deadline": string | null,
"team_entry": Database["public"]['Enums']["team_entry"],
"third_place_match": boolean,
"updated_at": string,
"venue_address": string | null,
"venue_name": string | null,
"visibility": Database["public"]['Enums']["visibility"]
            }
                          SetofOptions: {
        from: "*"
        to: "tournaments"
        isOneToOne: true
        isSetofReturn: false
      } },
"accept_team_invite":
{ Args: { "p_code": string }; Returns: string
                           },
"add_assistant":
{ Args: { "p_tournament_id": string,"p_username": string }; Returns: undefined
                           },
"add_squad_player":
{ Args: { "p_team_id": string,"p_user_id": string }; Returns: string
                           },
"admin_dashboard":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_find_user_by_email":
{ Args: { "p_email": string }; Returns: string
                           },
"announce_lot":
{ Args: { "p_kind": string,"p_lot_id": string }; Returns: undefined
                           },
"apply_as_player":
{ Args: { "p_answers"?: Json,"p_contact_phone"?: string,"p_details"?: Json,"p_experience": string,"p_notes"?: string,"p_role": string,"p_tournament_id": string }; Returns: string
                           },
"apply_with_team":
{ Args: { "p_color_primary"?: string,"p_color_secondary"?: string,"p_expected_squad_size"?: number,"p_home_ground"?: string,"p_logo_url"?: string,"p_manager_phone"?: string,"p_name": string,"p_notes"?: string,"p_tournament_id": string }; Returns: string
                           },
"cancel_tournament":
{ Args: { "p_reason": string,"p_tournament_id": string }; Returns: undefined
                           },
"change_city":
{ Args: { "p_city_id": string }; Returns: undefined
                           },
"close_lot_sold":
{ Args: { "p_lot_id": string }; Returns: undefined
                           },
"close_lot_unsold":
{ Args: { "p_lot_id": string }; Returns: undefined
                           },
"close_registration":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"complete_tournament":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"confirm_tournament_payment":
{ Args: { "p_order_id": string,"p_payment_id": string }; Returns: undefined
                           },
"create_team_invite":
{ Args: { "p_team_id": string }; Returns: string
                           },
"delete_chat_message":
{ Args: { "p_message_id": string }; Returns: undefined
                           },
"end_auction":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"expire_stale_data":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"go_live":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"has_active_subscription":
{ Args: { "uid"?: string }; Returns: boolean
                           },
"is_admin":
{ Args: { "uid"?: string }; Returns: boolean
                           },
"is_team_manager":
{ Args: { "team": string }; Returns: boolean
                           },
"is_tournament_member":
{ Args: { "tid": string }; Returns: boolean
                           },
"is_tournament_organizer":
{ Args: { "tid": string }; Returns: boolean
                           },
"is_tournament_owner":
{ Args: { "tid": string }; Returns: boolean
                           },
"lock_pool":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"lock_squads":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"match_result_public":
{ Args: { "mid": string }; Returns: boolean
                           },
"match_tournament":
{ Args: { "mid": string }; Returns: string
                           },
"mute_chat_user":
{ Args: { "p_minutes": number,"p_tid": string,"p_user": string }; Returns: undefined
                           },
"next_bid_amount":
{ Args: { "p_lot_id": string }; Returns: number
                           },
"open_bidding":
{ Args: { "p_lot_id": string }; Returns: undefined
                           },
"pause_auction":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"place_bid":
{ Args: { "p_expected_amount": number,"p_lot_id": string }; Returns: undefined
                           },
"post_announcement":
{ Args: { "p_body": string,"p_pin"?: boolean,"p_tid": string,"p_title": string }; Returns: string
                           },
"post_chat_message":
{ Args: { "p_body": string,"p_reply_to"?: string,"p_tid": string }; Returns: string
                           },
"publish_match_result":
{ Args: { "p_match_id": string }; Returns: undefined
                           },
"publish_tournament":
{ Args: { "p_tournament_id": string }; Returns: undefined
                           },
"recompute_standings":
{ Args: { "p_tournament_id": string }; Returns: undefined
                           },
"record_simple_sale":
{ Args: { "p_player_id": string,"p_price": number,"p_team_id": string,"p_tid": string }; Returns: undefined
                           },
"remove_assistant":
{ Args: { "p_tournament_id": string,"p_user_id": string }; Returns: undefined
                           },
"remove_squad_player":
{ Args: { "p_member_id": string }; Returns: undefined
                           },
"reopen_registration":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"report_content":
{ Args: { "p_reason": string,"p_target_id": string,"p_target_type": string }; Returns: string
                           },
"restore_expired_suspensions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"resume_auction":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"review_application":
{ Args: { "p_application_id": string,"p_decision": string,"p_reason"?: string }; Returns: undefined
                           },
"review_team":
{ Args: { "p_decision": string,"p_reason"?: string,"p_team_id": string }; Returns: undefined
                           },
"schedule_auction":
{ Args: { "p_at": string,"p_tid": string }; Returns: undefined
                           },
"select_lot":
{ Args: { "p_player_id": string,"p_tid": string }; Returns: string
                           },
"set_jersey_number":
{ Args: { "p_jersey": number,"p_member_id": string }; Returns: undefined
                           },
"set_match_live":
{ Args: { "p_match_id": string }; Returns: undefined
                           },
"set_squad_lock":
{ Args: { "p_lock": boolean,"p_team_id": string }; Returns: undefined
                           },
"slugify":
{ Args: { "t": string }; Returns: string
                           },
"start_auction":
{ Args: { "p_tid": string }; Returns: undefined
                           },
"tier_for_team_count":
{ Args: { "n": number }; Returns: string
                           },
"tournament_is_published":
{ Args: { "tid": string }; Returns: boolean
                           },
"transfer_tournament":
{ Args: { "p_tournament_id": string,"p_username": string }; Returns: undefined
                           },
"undo_last_bid":
{ Args: { "p_lot_id": string,"p_reason": string }; Returns: undefined
                           },
"withdraw_application":
{ Args: { "p_application_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "application_status": "pending"|"approved"|"rejected"|"withdrawn","auction_status": "not_scheduled"|"scheduled"|"live"|"paused"|"completed","invite_status": "pending"|"accepted"|"revoked"|"expired","lot_status": "upcoming"|"on_block"|"sold"|"unsold","match_status": "scheduled"|"live"|"completed"|"postponed"|"cancelled"|"abandoned"|"walkover","payment_status": "created"|"paid"|"failed"|"refunded","refund_status": "requested"|"approved"|"processed"|"rejected","report_status": "open"|"reviewing"|"resolved"|"dismissed","squad_mode": "auction"|"direct","squad_source": "auction"|"direct"|"invite","subscription_status": "created"|"active"|"past_due"|"cancelled"|"expired","team_entry": "invite"|"open"|"both","team_status": "invited"|"pending"|"approved"|"rejected"|"withdrawn","tournament_format": "league"|"knockout"|"league_playoffs"|"groups_knockout","tournament_status": "draft"|"paid"|"registration_open"|"registration_closed"|"auction"|"squads_locked"|"live"|"completed"|"cancelled","user_status": "active"|"suspended"|"banned","visibility": "public"|"unlisted"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "application_status": ["pending", "approved", "rejected", "withdrawn"],"auction_status": ["not_scheduled", "scheduled", "live", "paused", "completed"],"invite_status": ["pending", "accepted", "revoked", "expired"],"lot_status": ["upcoming", "on_block", "sold", "unsold"],"match_status": ["scheduled", "live", "completed", "postponed", "cancelled", "abandoned", "walkover"],"payment_status": ["created", "paid", "failed", "refunded"],"refund_status": ["requested", "approved", "processed", "rejected"],"report_status": ["open", "reviewing", "resolved", "dismissed"],"squad_mode": ["auction", "direct"],"squad_source": ["auction", "direct", "invite"],"subscription_status": ["created", "active", "past_due", "cancelled", "expired"],"team_entry": ["invite", "open", "both"],"team_status": ["invited", "pending", "approved", "rejected", "withdrawn"],"tournament_format": ["league", "knockout", "league_playoffs", "groups_knockout"],"tournament_status": ["draft", "paid", "registration_open", "registration_closed", "auction", "squads_locked", "live", "completed", "cancelled"],"user_status": ["active", "suspended", "banned"],"visibility": ["public", "unlisted"]
          }
        }
} as const
