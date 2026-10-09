import type { Palette } from '../colors';

/** The computed, cache-ready representation of a whole league history. */

export type SeasonResult = 'champion' | 'runner-up' | 'third' | 'playoffs' | 'missed' | 'in-progress' | 'upcoming';
export type GameKind = 'regular' | 'playoff' | 'placement' | 'consolation';

export interface PlayerLine {
  playerId: string;
  name: string;
  pos: string;
  points: number;
  starts: number;
}

export interface HofEntry extends PlayerLine {
  season: string;
  franchiseId: string;
}

export interface Blunder {
  season: string;
  week: number;
  slot: string;
  starterId: string;
  starterName: string;
  starterPts: number;
  benchId: string;
  benchName: string;
  benchPts: number;
  cost: number;
}

export interface TeamSeason {
  season: string;
  rosterId: number;
  teamName: string;
  avatarUrl: string | null;
  w: number;
  l: number;
  t: number;
  pf: number;
  pa: number;
  weeks: number;
  avgPF: number;
  avgPA: number;
  maxPF: number | null;
  rank: number;
  finish: number | null;
  result: SeasonResult;
  playoffW: number;
  playoffL: number;
  startBench: { decisions: number; correct: number };
  topPlayers: PlayerLine[];
}

export interface LegacyLine {
  key: string;
  label: string;
  count: number;
  weight: number;
  points: number;
}

export interface Franchise {
  id: string;
  name: string;
  manager: string;
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
  abbr: string;
  jerseyNumber: number;
  active: boolean;
  firstSeason: string;
  lastSeason: string;
  nameHistory: Array<{ name: string; from: string; to: string }>;
  managerHistory: string[];
  seasons: TeamSeason[];
  regular: { w: number; l: number; t: number; pf: number; pa: number; weeks: number; winPct: number; avgPF: number; avgPA: number };
  playoffs: { w: number; l: number; pf: number; pa: number; games: number };
  titles: string[];
  runnerUps: string[];
  thirds: string[];
  playoffApps: string[];
  regularSeasonTitles: string[];
  pointsTitles: string[];
  lastPlaces: string[];
  legacy: { score: number; rank: number; lines: LegacyLine[] };
  startBench: { decisions: number; correct: number; rate: number | null; rank: number | null; blunders: Blunder[] };
  hallOfFame: { byPosition: HofEntry[]; bySeason: HofEntry[] };
  rivalId: string | null;
  palette: Palette;
}

export interface Game {
  id: string;
  season: string;
  week: number;
  kind: GameKind;
  label: string | null;
  a: string;
  b: string;
  aPts: number;
  bPts: number;
  winner: string | null;
}

export interface PairRecord {
  key: string;
  a: string;
  b: string;
  games: number;
  aWins: number;
  bWins: number;
  ties: number;
  aPts: number;
  bPts: number;
  playoffGames: number;
  gameIds: string[];
}

export interface BracketGame {
  round: number;
  match: number;
  placement: number | null;
  label: string;
  a: string | null;
  b: string | null;
  aSeed: number | null;
  bSeed: number | null;
  aPts: number | null;
  bPts: number | null;
  winner: string | null;
}

export interface StandingRow {
  franchiseId: string;
  rosterId: number;
  teamName: string;
  rank: number;
  w: number;
  l: number;
  t: number;
  pf: number;
  pa: number;
  avgPF: number;
  avgPA: number;
  madePlayoffs: boolean;
  finish: number | null;
  result: SeasonResult;
}

export interface SeasonModel {
  season: string;
  leagueId: string;
  name: string;
  status: string;
  state: 'complete' | 'in-progress' | 'upcoming';
  weeksPlayed: number;
  regularWeeks: number;
  playoffWeekStart: number;
  teams: number;
  playoffTeams: number;
  standings: StandingRow[];
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  bracket: BracketGame[];
  consolation: BracketGame[];
  gameIds: string[];
  mvp: HofEntry | null;
  highScore: { franchiseId: string; week: number; points: number } | null;
  trades: number;
}

export interface TradeSide {
  franchiseId: string;
  received: Array<{ playerId: string; name: string; pos: string; points: number; starts: number; weeks: number }>;
  picks: Array<{ season: string; round: number; originalFranchiseId: string | null }>;
  faab: number;
  value: number;
}

export interface TradeModel {
  id: string;
  season: string;
  week: number;
  created: number;
  sides: TradeSide[];
  winnerId: string | null;
  margin: number;
}

export interface TeamGameRecord {
  franchiseId: string;
  opponentId: string;
  season: string;
  week: number;
  points: number;
  label: string | null;
}

export interface GameRecord {
  gameId: string;
  margin: number;
}

export interface LeagueRecords {
  highestScore: TeamGameRecord | null;
  lowestScore: TeamGameRecord | null;
  biggestBlowout: GameRecord | null;
  closestGame: GameRecord | null;
  mostPointsSeason: { franchiseId: string; season: string; pf: number; weeks: number } | null;
  bestRecord: { franchiseId: string; season: string; w: number; l: number; t: number } | null;
  longestWinStreak: {
    franchiseId: string;
    length: number;
    from: { season: string; week: number };
    to: { season: string; week: number };
  } | null;
  bestPlayerGame: (PlayerLine & { franchiseId: string; season: string; week: number }) | null;
  bestPlayerSeason: HofEntry | null;
}

export interface LegacyWeight {
  key: string;
  label: string;
  weight: number;
  note: string;
}

export interface LeagueModel {
  schema: number;
  leagueId: string;
  rootLeagueId: string;
  name: string;
  avatarUrl: string | null;
  source: 'live' | 'demo';
  builtAt: number;
  buildMs: number;
  sleeperRequests: number;
  playerDataAt: number | null;
  nflState: { season: string; week: number; seasonType: string };
  format: {
    teams: number;
    playoffTeams: number;
    scoring: string;
    leagueType: string;
    rosterPositions: string[];
  };
  seasons: SeasonModel[];
  franchises: Franchise[];
  games: Record<string, Game>;
  gameOrder: string[];
  pairs: Record<string, PairRecord>;
  rivalries: string[];
  trades: TradeModel[];
  records: LeagueRecords;
  legacyWeights: LegacyWeight[];
}

export const MODEL_SCHEMA = 4;
