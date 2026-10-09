import 'server-only';
import { createLimiter, metrics } from '../runtime';
import { getPalette } from '../palette';
import { sourceFor } from '../sleeper';
import type { SleeperLeague, SleeperNflState } from '../sleeper/types';
import { computeModel, type SeasonInput } from './compute';
import type { LeagueModel } from './types';

export interface BuildProgress {
  phase: 'history' | 'fetching' | 'computing' | 'colors' | 'done';
  done: number;
  total: number;
  message: string;
  startedAt: number;
}

export class LeagueNotFoundError extends Error {
  constructor(id: string) {
    super(`No Sleeper league found with id ${id}`);
  }
}

/** Last week whose games are final for this season. */
export function lastCompletedWeek(league: SleeperLeague, state: SleeperNflState): number {
  if (league.status === 'complete') return 99;
  if (league.status === 'pre_draft' || league.status === 'drafting') return 0;
  if (state.season === league.season) {
    if (state.season_type === 'regular') return Math.max(0, Number(state.week) - 1);
    if (state.season_type === 'pre') return 0;
    return 18; // NFL postseason or offseason: the fantasy season is over
  }
  return Number(state.season) > Number(league.season) ? 18 : 0;
}

export async function buildLeagueModel(
  leagueId: string,
  onProgress: (p: BuildProgress) => void = () => {},
): Promise<LeagueModel> {
  const source = sourceFor(leagueId);
  const t0 = performance.now();
  const requests0 = metrics.sleeperRequests;
  const startedAt = Date.now();
  const report = (phase: BuildProgress['phase'], done: number, total: number, message: string) =>
    onProgress({ phase, done, total, message, startedAt });

  // 1. Walk previous_league_id back to the league's first season.
  report('history', 0, 1, 'Tracing league history');
  const chain: SleeperLeague[] = [];
  const seen = new Set<string>();
  let cursor: string | null = leagueId;
  while (cursor && cursor !== '0' && !seen.has(cursor) && chain.length < 30) {
    seen.add(cursor);
    const league = await source.league(cursor);
    if (!league) {
      if (chain.length === 0) throw new LeagueNotFoundError(leagueId);
      break;
    }
    chain.push(league);
    report('history', chain.length, chain.length + 1, `Found the ${league.season} season`);
    cursor = league.previous_league_id;
  }
  chain.reverse();

  // 2. Player data (cached daily) downloads while season data is fetched.
  const playersPromise = source.players();
  const state = await source.nflState();

  // 3. Every season's users, rosters, brackets, weekly matchups and trades.
  const plans = chain.map((league) => {
    const last = lastCompletedWeek(league, state);
    const immutable = league.status === 'complete';
    const matchupWeeks = immutable ? 18 : Math.min(18, last);
    const txWeeks = last === 0 ? 0 : immutable ? 18 : Math.min(18, last + 1);
    return { league, last, immutable, matchupWeeks, txWeeks };
  });
  const total = plans.reduce((t, p) => t + 4 + p.matchupWeeks + p.txWeeks, 0);
  let done = 0;
  const tick = <T,>(p: Promise<T>) =>
    p.then((v) => {
      done++;
      if (done % 4 === 0 || done === total) report('fetching', done, total, 'Downloading seasons from Sleeper');
      return v;
    });

  const seasonInputs: SeasonInput[] = await Promise.all(
    plans.map(async ({ league, last, immutable, matchupWeeks, txWeeks }) => {
      const id = league.league_id;
      const weeks = Array.from({ length: matchupWeeks }, (_, i) => i + 1);
      const tWeeks = Array.from({ length: txWeeks }, (_, i) => i + 1);
      const [users, rosters, winners, losers, matchupLists, txLists] = await Promise.all([
        tick(source.users(id, immutable)),
        tick(source.rosters(id, immutable)),
        tick(source.winnersBracket(id, immutable)),
        tick(source.losersBracket(id, immutable)),
        Promise.all(weeks.map((w) => tick(source.matchups(id, w, immutable)))),
        Promise.all(tWeeks.map((w) => tick(source.transactions(id, w, immutable)))),
      ]);
      const matchups = new Map<number, typeof matchupLists[number]>();
      weeks.forEach((w, i) => {
        if (matchupLists[i]?.length) matchups.set(w, matchupLists[i]);
      });
      const avatars: SeasonInput['avatars'] = {};
      for (const u of users) avatars[u.user_id] = { full: source.avatarUrl(u, 'full'), thumb: source.avatarUrl(u, 'thumb') };
      return {
        league,
        users,
        rosters: rosters ?? [],
        matchups,
        winners: Array.isArray(winners) ? winners : [],
        losers: Array.isArray(losers) ? losers : [],
        transactions: txLists.flat().filter(Boolean),
        lastCompletedWeek: last,
        avatars,
      };
    }),
  );

  const { players, fetchedAt } = await playersPromise;

  // 4. Compute every statistic once.
  report('computing', 0, 1, 'Crunching standings, rivalries and trades');
  const computed = computeModel({
    leagueId,
    seasons: seasonInputs,
    players,
    playerDataAt: fetchedAt,
    nflState: { season: state.season, week: Number(state.week), seasonType: state.season_type },
    source: source.kind,
    leagueAvatarUrl: chain.length ? source.leagueAvatarUrl(chain[chain.length - 1]) : null,
  });

  // 5. Team colors from each logo (cached per logo, so usually instant).
  const limit = createLimiter(4);
  let colored = 0;
  await Promise.all(
    computed.franchises.map((f) =>
      limit(async () => {
        f.palette = await getPalette(f.avatarUrl, f.id);
        colored++;
        report('colors', colored, computed.franchises.length, 'Matching team colors to logos');
      }),
    ),
  );

  metrics.leagueBuilds++;
  report('done', 1, 1, 'Ready');
  return {
    ...computed,
    builtAt: Date.now(),
    buildMs: Math.round(performance.now() - t0),
    sleeperRequests: metrics.sleeperRequests - requests0,
  };
}
