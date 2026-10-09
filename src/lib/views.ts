import { pairKey } from './model/compute';
import type { Franchise, Game, LeagueModel, TradeModel } from './model/types';

/**
 * Read-only views over a LeagueModel. Every page and JSON endpoint goes
 * through these, and they only slice precomputed data, so they run in a few
 * milliseconds even for long-running leagues.
 */

const indexCache = new WeakMap<LeagueModel, Map<string, Franchise>>();

export function franchiseIndex(model: LeagueModel) {
  let idx = indexCache.get(model);
  if (!idx) {
    idx = new Map(model.franchises.map((f) => [f.id, f]));
    indexCache.set(model, idx);
  }
  return idx;
}

export function teamById(model: LeagueModel, id: string) {
  return franchiseIndex(model).get(id) ?? null;
}

export function legacyStandings(model: LeagueModel) {
  return model.franchises.map((f) => ({
    rank: f.legacy.rank,
    id: f.id,
    name: f.name,
    manager: f.manager,
    active: f.active,
    avatarUrl: f.avatarThumbUrl,
    legacyScore: f.legacy.score,
    titles: f.titles.length,
    runnerUps: f.runnerUps.length,
    playoffApps: f.playoffApps.length,
    seasons: f.seasons.filter((s) => s.result !== 'upcoming').length,
    record: { w: f.regular.w, l: f.regular.l, t: f.regular.t },
    winPct: f.regular.winPct,
    avgPF: f.regular.avgPF,
    avgPA: f.regular.avgPA,
  }));
}

export function seasonView(model: LeagueModel, season: string) {
  const s = model.seasons.find((x) => x.season === season);
  if (!s) return null;
  const games = s.gameIds.map((id) => model.games[id]);
  const weeks = new Map<number, Game[]>();
  for (const g of games) {
    if (g.kind !== 'regular') continue;
    const list = weeks.get(g.week) ?? [];
    list.push(g);
    weeks.set(g.week, list);
  }
  return {
    season: s,
    weeks: [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([week, list]) => ({ week, games: list })),
    trades: model.trades.filter((t) => t.season === season),
  };
}

export interface OrientedGame extends Game {
  us: number;
  them: number;
  result: 'W' | 'L' | 'T';
}

function orient(g: Game, us: string): OrientedGame {
  const mine = g.a === us ? g.aPts : g.bPts;
  const theirs = g.a === us ? g.bPts : g.aPts;
  return { ...g, us: mine, them: theirs, result: g.winner === us ? 'W' : g.winner ? 'L' : 'T' };
}

export function headToHead(model: LeagueModel, aId: string, bId: string) {
  const pair = model.pairs[pairKey(aId, bId)];
  const games = (pair?.gameIds ?? []).map((id) => orient(model.games[id], aId));
  const aWins = games.filter((g) => g.result === 'W').length;
  const bWins = games.filter((g) => g.result === 'L').length;
  const ties = games.length - aWins - bWins;
  const aPts = games.reduce((t, g) => t + g.us, 0);
  const bPts = games.reduce((t, g) => t + g.them, 0);
  const margin = (g: OrientedGame) => Math.abs(g.us - g.them);
  const biggest = (result: 'W' | 'L') =>
    games.filter((g) => g.result === result).sort((x, y) => margin(y) - margin(x))[0] ?? null;
  const closest = [...games].sort((x, y) => margin(x) - margin(y))[0] ?? null;

  let streakHolder: 'a' | 'b' | null = null;
  let streak = 0;
  for (let i = games.length - 1; i >= 0; i--) {
    const holder = games[i].result === 'W' ? 'a' : games[i].result === 'L' ? 'b' : null;
    if (!holder) break;
    if (streakHolder === null) streakHolder = holder;
    if (holder !== streakHolder) break;
    streak++;
  }
  const longest = (who: 'W' | 'L') => {
    let best = 0;
    let run = 0;
    for (const g of games) {
      run = g.result === who ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };
  const split = (kind: 'regular' | 'post') => {
    const list = games.filter((g) => (kind === 'regular' ? g.kind === 'regular' : g.kind !== 'regular'));
    return {
      games: list.length,
      aWins: list.filter((g) => g.result === 'W').length,
      bWins: list.filter((g) => g.result === 'L').length,
    };
  };
  return {
    aId,
    bId,
    games,
    aWins,
    bWins,
    ties,
    aPts,
    bPts,
    aAvg: games.length ? aPts / games.length : 0,
    bAvg: games.length ? bPts / games.length : 0,
    aBiggestWin: biggest('W'),
    bBiggestWin: biggest('L'),
    closest,
    streak: streakHolder ? { holder: streakHolder === 'a' ? aId : bId, length: streak } : null,
    longestA: longest('W'),
    longestB: longest('L'),
    regular: split('regular'),
    postseason: split('post'),
    lastMeeting: games[games.length - 1] ?? null,
  };
}

/** All of one team's opponents with series records, most-played first. */
export function opponentsOf(model: LeagueModel, id: string) {
  return Object.values(model.pairs)
    .filter((p) => p.a === id || p.b === id)
    .map((p) => {
      const us = p.a === id;
      return {
        opponentId: us ? p.b : p.a,
        games: p.games,
        wins: us ? p.aWins : p.bWins,
        losses: us ? p.bWins : p.aWins,
        ties: p.ties,
        pf: us ? p.aPts : p.bPts,
        pa: us ? p.bPts : p.aPts,
        playoffGames: p.playoffGames,
      };
    })
    .sort((x, y) => y.games - x.games || y.wins - y.losses - (x.wins - x.losses));
}

export type Better = 'high' | 'low' | 'none';

export function compareView(model: LeagueModel, aId: string, bId: string) {
  const a = teamById(model, aId);
  const b = teamById(model, bId);
  if (!a || !b) return null;
  const best = (f: Franchise) => {
    const finishes = f.seasons.map((s) => s.finish).filter((x): x is number => x != null);
    return finishes.length ? Math.min(...finishes) : null;
  };
  const rows: Array<{ label: string; a: number | null; b: number | null; better: Better; kind: string }> = [
    { label: 'Legacy Score', a: a.legacy.score, b: b.legacy.score, better: 'high', kind: 'score' },
    { label: 'Legacy rank', a: a.legacy.rank, b: b.legacy.rank, better: 'low', kind: 'rank' },
    { label: 'Championships', a: a.titles.length, b: b.titles.length, better: 'high', kind: 'int' },
    { label: 'Runner-up finishes', a: a.runnerUps.length, b: b.runnerUps.length, better: 'high', kind: 'int' },
    { label: 'Playoff appearances', a: a.playoffApps.length, b: b.playoffApps.length, better: 'high', kind: 'int' },
    { label: 'Playoff wins', a: a.playoffs.w, b: b.playoffs.w, better: 'high', kind: 'int' },
    { label: 'Regular-season win %', a: a.regular.winPct, b: b.regular.winPct, better: 'high', kind: 'pct3' },
    { label: 'Points per game', a: a.regular.avgPF, b: b.regular.avgPF, better: 'high', kind: 'pts' },
    { label: 'Points allowed per game', a: a.regular.avgPA, b: b.regular.avgPA, better: 'low', kind: 'pts' },
    { label: 'Best finish', a: best(a), b: best(b), better: 'low', kind: 'ordinal' },
    { label: 'Start/sit success', a: a.startBench.rate, b: b.startBench.rate, better: 'high', kind: 'percent' },
    { label: 'Seasons played', a: a.seasons.filter((s) => s.result !== 'upcoming').length, b: b.seasons.filter((s) => s.result !== 'upcoming').length, better: 'none', kind: 'int' },
  ];
  const seasons = model.seasons.map((s) => ({
    season: s.season,
    a: a.seasons.find((x) => x.season === s.season) ?? null,
    b: b.seasons.find((x) => x.season === s.season) ?? null,
  }));
  return { a, b, rows, seasons, h2h: headToHead(model, aId, bId) };
}

export function tradesFor(model: LeagueModel, opts: { season?: string; team?: string } = {}): TradeModel[] {
  return model.trades.filter(
    (t) => (!opts.season || t.season === opts.season) && (!opts.team || t.sides.some((s) => s.franchiseId === opts.team)),
  );
}

export function teamView(model: LeagueModel, id: string) {
  const team = teamById(model, id);
  if (!team) return null;
  return {
    team,
    opponents: opponentsOf(model, id),
    trades: tradesFor(model, { team: id }),
    rival: team.rivalId ? teamById(model, team.rivalId) : null,
  };
}

/** League-wide average points per team-game, by season (for chart reference marks). */
export function leagueAverages(model: LeagueModel) {
  const out: Record<string, number> = {};
  for (const s of model.seasons) {
    const rows = s.standings.filter((r) => r.avgPF > 0);
    out[s.season] = rows.length ? rows.reduce((t, r) => t + r.avgPF, 0) / rows.length : 0;
  }
  return out;
}

/** The requested pair of teams, or the league's top rivalry when the query is missing or invalid. */
export function resolvePair(model: LeagueModel, rawA?: string | string[], rawB?: string | string[]) {
  const valid = (v?: string | string[]) => (typeof v === 'string' && teamById(model, v) ? v : null);
  const top = model.rivalries[0] ? model.pairs[model.rivalries[0]] : null;
  const a = valid(rawA) ?? top?.a ?? model.franchises[0]?.id ?? '';
  let b = valid(rawB);
  if (!b || b === a) {
    b = top && top.a === a ? top.b : top && top.b === a ? top.a : model.franchises.find((f) => f.id !== a)?.id ?? '';
  }
  return { a, b };
}
