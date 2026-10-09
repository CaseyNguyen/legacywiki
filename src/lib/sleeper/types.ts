/** Raw shapes returned by the Sleeper API (https://docs.sleeper.com). */

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: 'pre_draft' | 'drafting' | 'in_season' | 'complete' | string;
  sport?: string;
  season_type?: string;
  total_rosters: number;
  previous_league_id: string | null;
  avatar: string | null;
  draft_id?: string | null;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: {
    playoff_week_start?: number;
    playoff_teams?: number;
    /** 0 = one week per round, 1 = two-week championship, 2 = two weeks per round. */
    playoff_round_type?: number;
    last_scored_leg?: number;
    num_teams?: number;
    league_average_match?: number;
    /** 0 redraft, 1 keeper, 2 dynasty */
    type?: number;
    [key: string]: unknown;
  };
}

export interface SleeperUser {
  user_id: string;
  username?: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string; avatar?: string; [key: string]: unknown } | null;
  is_owner?: boolean | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  co_owners?: string[] | null;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  reserve?: string[] | null;
  taxi?: string[] | null;
  settings: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    ppts?: number;
    ppts_decimal?: number;
    division?: number;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown> | null;
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number | null;
  points: number | null;
  custom_points?: number | null;
  starters: string[] | null;
  starters_points?: number[] | null;
  players: string[] | null;
  players_points?: Record<string, number> | null;
}

export interface SleeperBracketMatch {
  r: number;
  m: number;
  t1: number | null;
  t2: number | null;
  w: number | null;
  l: number | null;
  t1_from?: { w?: number; l?: number } | null;
  t2_from?: { w?: number; l?: number } | null;
  p?: number | null;
}

export interface SleeperDraftPick {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id: number;
  owner_id: number;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status: string;
  leg: number;
  created: number;
  status_updated?: number;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: SleeperDraftPick[] | null;
  waiver_budget: Array<{ sender: number; receiver: number; amount: number }> | null;
  creator?: string;
  consenter_ids?: number[] | null;
}

export interface SleeperNflState {
  week: number;
  season: string;
  season_type: string;
  display_week?: number;
  leg?: number;
  league_season?: string;
  previous_season?: string;
}

export interface SleeperPlayer {
  player_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  position?: string | null;
  fantasy_positions?: string[] | null;
  team?: string | null;
}

/** Trimmed player record we keep in the daily cache: name, position, eligibility, NFL team. */
export interface CompactPlayer {
  n: string;
  p: string;
  f?: string[];
  t?: string;
}

export type PlayerMap = Record<string, CompactPlayer>;

/**
 * Everything the model builder needs. The live implementation talks to
 * api.sleeper.app; the demo implementation generates a deterministic league.
 */
export interface SleeperSource {
  kind: 'live' | 'demo';
  league(id: string): Promise<SleeperLeague | null>;
  users(id: string, immutable: boolean): Promise<SleeperUser[]>;
  rosters(id: string, immutable: boolean): Promise<SleeperRoster[]>;
  matchups(id: string, week: number, immutable: boolean): Promise<SleeperMatchup[]>;
  winnersBracket(id: string, immutable: boolean): Promise<SleeperBracketMatch[]>;
  losersBracket(id: string, immutable: boolean): Promise<SleeperBracketMatch[]>;
  transactions(id: string, week: number, immutable: boolean): Promise<SleeperTransaction[]>;
  nflState(): Promise<SleeperNflState>;
  players(): Promise<{ players: PlayerMap; fetchedAt: number | null }>;
  avatarUrl(user: SleeperUser | undefined, size: 'full' | 'thumb'): string | null;
  leagueAvatarUrl(league: SleeperLeague): string | null;
}
