import { fallbackPalette } from '../colors';
import type {
  PlayerMap,
  SleeperBracketMatch,
  SleeperLeague,
  SleeperMatchup,
  SleeperRoster,
  SleeperTransaction,
  SleeperUser,
} from '../sleeper/types';
import { LEGACY_WEIGHTS, legacyLines, legacyTotal } from './legacy';
import {
  MODEL_SCHEMA,
  type BracketGame,
  type Blunder,
  type Franchise,
  type Game,
  type HofEntry,
  type LeagueModel,
  type LeagueRecords,
  type PairRecord,
  type PlayerLine,
  type SeasonModel,
  type SeasonResult,
  type StandingRow,
  type TeamSeason,
  type TradeModel,
  type TradeSide,
} from './types';

/**
 * Turns raw Sleeper responses for every season of a league into the LeagueModel.
 * Pure and synchronous: given the same input it always produces the same model,
 * which is what lets every page and endpoint read from a cache.
 */

export interface SeasonInput {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  matchups: Map<number, SleeperMatchup[]>;
  winners: SleeperBracketMatch[];
  losers: SleeperBracketMatch[];
  transactions: SleeperTransaction[];
  lastCompletedWeek: number;
  avatars: Record<string, { full: string | null; thumb: string | null }>;
}

export interface ComputeInput {
  leagueId: string;
  seasons: SeasonInput[];
  players: PlayerMap;
  playerDataAt: number | null;
  nflState: { season: string; week: number; seasonType: string };
  source: 'live' | 'demo';
  leagueAvatarUrl: string | null;
}

/** Which player positions may fill each lineup slot. */
export const SLOT_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  DL: ['DL', 'DE', 'DT'],
  LB: ['LB', 'ILB', 'OLB'],
  DB: ['DB', 'CB', 'S', 'SS', 'FS'],
  IDP_FLEX: ['DL', 'DE', 'DT', 'LB', 'ILB', 'OLB', 'DB', 'CB', 'S', 'SS', 'FS'],
};
const NON_STARTING = new Set(['BN', 'IR', 'TAXI']);
export const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];

const r2 = (n: number) => Math.round(n * 100) / 100;
const matchupPoints = (m: SleeperMatchup) => m.custom_points ?? m.points ?? 0;
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface WeekEntry {
  season: string;
  week: number;
  players: Set<string>;
  starters: Set<string>;
  pp: Record<string, number>;
  counted: boolean;
}

interface Acc {
  id: string;
  seasons: TeamSeason[];
  names: Array<{ season: string; name: string }>;
  managers: string[];
  avatar: { full: string | null; thumb: string | null };
  latestRosterId: number;
  hof: Map<string, Map<string, { points: number; starts: number }>>;
  decisions: number;
  correct: number;
  blunders: Blunder[];
  playoffs: { w: number; l: number; pf: number; pa: number; games: number };
  titles: string[];
  runnerUps: string[];
  thirds: string[];
  playoffApps: string[];
  regularSeasonTitles: string[];
  pointsTitles: string[];
  lastPlaces: string[];
  weekly: WeekEntry[];
}

function abbreviate(name: string) {
  const words = name
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['the', 'of', 'and', 'fc'].includes(w.toLowerCase()));
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]!.toUpperCase()).join('');
  return (words[0] ?? name).slice(0, 3).toUpperCase() || 'TM';
}

function roundLabel(match: SleeperBracketMatch, totalRounds: number, consolation: boolean) {
  if (consolation) return 'Consolation game';
  if (match.p === 1) return 'Championship';
  if (match.p === 3) return 'Third-place game';
  if (match.p && match.p > 3) return `${ordinal(match.p)}-place game`;
  const fromEnd = totalRounds - match.r;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quarterfinal';
  return `Round ${match.r}`;
}

/** Costliest benchings first, counting each benched player once per week. */
function uniqueBlunders(list: Blunder[]) {
  const seen = new Set<string>();
  return [...list]
    .sort((x, y) => y.cost - x.cost)
    .filter((b) => {
      const key = `${b.season}-${b.week}-${b.benchId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function computeModel(input: ComputeInput): Omit<LeagueModel, 'builtAt' | 'buildMs' | 'sleeperRequests'> {
  const { players } = input;
  const accs = new Map<string, Acc>();
  const games: Record<string, Game> = {};
  const gameOrder: string[] = [];
  const seasonModels: SeasonModel[] = [];
  const trades: TradeModel[] = [];
  let bestPlayerGame: LeagueRecords['bestPlayerGame'] = null;

  const nameOf = (pid: string) => players[pid]?.n ?? (pid === '0' ? 'Empty slot' : `Player ${pid}`);
  const posOf = (pid: string) => players[pid]?.p || '—';
  const eligibleOf = (pid: string) => players[pid]?.f ?? (players[pid]?.p ? [players[pid]!.p] : []);

  const acc = (id: string): Acc => {
    let a = accs.get(id);
    if (!a) {
      a = {
        id,
        seasons: [],
        names: [],
        managers: [],
        avatar: { full: null, thumb: null },
        latestRosterId: 0,
        hof: new Map(),
        decisions: 0,
        correct: 0,
        blunders: [],
        playoffs: { w: 0, l: 0, pf: 0, pa: 0, games: 0 },
        titles: [],
        runnerUps: [],
        thirds: [],
        playoffApps: [],
        regularSeasonTitles: [],
        pointsTitles: [],
        lastPlaces: [],
        weekly: [],
      };
      accs.set(id, a);
    }
    return a;
  };

  for (const s of input.seasons) {
    const season = s.league.season;
    const settings = s.league.settings ?? {};
    const usersById = new Map(s.users.map((u) => [u.user_id, u]));
    const rosterToF = new Map<number, string>();
    const teamNameOf = new Map<number, string>();
    const last = s.lastCompletedWeek;
    const ps = Number(settings.playoff_week_start ?? 15);
    const regularWeeks = ps > 1 ? ps - 1 : 17;
    const roundType = Number(settings.playoff_round_type ?? 0);
    const totalRounds = s.winners.reduce((m, g) => Math.max(m, g.r), 0);
    const state: SeasonModel['state'] =
      s.league.status === 'complete' ? 'complete' : last > 0 ? 'in-progress' : 'upcoming';
    const regularComplete = state === 'complete' || last >= regularWeeks;

    const weeksForRound = (r: number) => {
      const start = ps > 1 ? ps : regularWeeks + 1;
      if (roundType === 2) return [start + 2 * (r - 1), start + 2 * (r - 1) + 1];
      if (roundType === 1 && r === totalRounds) return [start + r - 1, start + r];
      return [start + r - 1];
    };

    for (const r of s.rosters) {
      const fid = r.owner_id ?? `roster-${r.roster_id}`;
      rosterToF.set(r.roster_id, fid);
      const user = r.owner_id ? usersById.get(r.owner_id) : undefined;
      const metaName = typeof user?.metadata?.team_name === 'string' ? user.metadata.team_name.trim() : '';
      const teamName = metaName || user?.display_name || `Team ${r.roster_id}`;
      teamNameOf.set(r.roster_id, teamName);
      const a = acc(fid);
      a.names.push({ season, name: teamName });
      const manager = user?.display_name || 'Unclaimed team';
      if (!a.managers.includes(manager)) a.managers.push(manager);
      a.latestRosterId = r.roster_id;
      const av = r.owner_id ? s.avatars[r.owner_id] : undefined;
      if (av?.full) a.avatar = av;
    }

    // ---- points by (week, roster) and regular-season games --------------------
    const pointsBy = new Map<string, number>();
    for (const [week, list] of s.matchups) {
      for (const m of list) pointsBy.set(`${week}:${m.roster_id}`, matchupPoints(m));
    }

    const seasonGameIds: string[] = [];
    const regGames = new Map<number, { weeks: number; pf: number; pa: number; w: number; l: number; t: number }>();
    for (let w = 1; w <= Math.min(regularWeeks, last); w++) {
      const groups = new Map<number, SleeperMatchup[]>();
      for (const m of s.matchups.get(w) ?? []) {
        if (m.matchup_id == null) continue;
        const g = groups.get(m.matchup_id) ?? [];
        g.push(m);
        groups.set(m.matchup_id, g);
      }
      for (const [mid, pair] of groups) {
        if (pair.length !== 2) continue;
        const [x, y] = pair;
        const fa = rosterToF.get(x.roster_id);
        const fb = rosterToF.get(y.roster_id);
        if (!fa || !fb) continue;
        const ap = r2(matchupPoints(x));
        const bp = r2(matchupPoints(y));
        const id = `${season}-${w}-${mid}`;
        games[id] = {
          id,
          season,
          week: w,
          kind: 'regular',
          label: null,
          a: fa,
          b: fb,
          aPts: ap,
          bPts: bp,
          winner: ap > bp ? fa : bp > ap ? fb : null,
        };
        gameOrder.push(id);
        seasonGameIds.push(id);
        for (const [rid, mine, theirs] of [
          [x.roster_id, ap, bp],
          [y.roster_id, bp, ap],
        ] as const) {
          const rec = regGames.get(rid) ?? { weeks: 0, pf: 0, pa: 0, w: 0, l: 0, t: 0 };
          rec.weeks++;
          rec.pf += mine;
          rec.pa += theirs;
          if (mine > theirs) rec.w++;
          else if (mine < theirs) rec.l++;
          else rec.t++;
          regGames.set(rid, rec);
        }
      }
    }

    // ---- standings (official Sleeper records, falling back to computed) -------
    const standingsRaw = s.rosters.map((r) => {
      const st = r.settings ?? {};
      const comp = regGames.get(r.roster_id) ?? { weeks: 0, pf: 0, pa: 0, w: 0, l: 0, t: 0 };
      const hasOfficial = typeof st.wins === 'number' && (st.wins ?? 0) + (st.losses ?? 0) + (st.ties ?? 0) > 0;
      const officialPf = (st.fpts ?? 0) + (st.fpts_decimal ?? 0) / 100;
      const officialPa = (st.fpts_against ?? 0) + (st.fpts_against_decimal ?? 0) / 100;
      const pf = officialPf > 0 ? officialPf : comp.pf;
      const pa = officialPa > 0 ? officialPa : comp.pa;
      const maxPF = st.ppts != null ? (st.ppts ?? 0) + (st.ppts_decimal ?? 0) / 100 : null;
      return {
        rosterId: r.roster_id,
        franchiseId: rosterToF.get(r.roster_id)!,
        teamName: teamNameOf.get(r.roster_id)!,
        w: hasOfficial ? st.wins ?? 0 : comp.w,
        l: hasOfficial ? st.losses ?? 0 : comp.l,
        t: hasOfficial ? st.ties ?? 0 : comp.t,
        pf: r2(pf),
        pa: r2(pa),
        weeks: comp.weeks,
        maxPF: maxPF && maxPF > 0 ? r2(maxPF) : null,
      };
    });
    const pct = (x: { w: number; l: number; t: number }) => {
      const g = x.w + x.l + x.t;
      return g ? (x.w + x.t / 2) / g : 0;
    };
    standingsRaw.sort((a, b) => pct(b) - pct(a) || b.pf - a.pf);
    const rankOf = new Map(standingsRaw.map((row, i) => [row.rosterId, i + 1]));

    // ---- playoff brackets --------------------------------------------------------
    const playoffRosters = new Set<number>();
    for (const m of s.winners) {
      if (typeof m.t1 === 'number') playoffRosters.add(m.t1);
      if (typeof m.t2 === 'number') playoffRosters.add(m.t2);
    }
    const bracketWeekPlayed = new Set<string>();
    const playoffRecord = new Map<number, { w: number; l: number; pf: number; pa: number; games: number }>();

    const processBracket = (bracket: SleeperBracketMatch[], consolation: boolean): BracketGame[] => {
      const rounds = bracket.reduce((m, g) => Math.max(m, g.r), 0);
      return [...bracket]
        .sort((x, y) => x.r - y.r || x.m - y.m)
        .map((m) => {
          const weeks = weeksForRound(m.r);
          const a = typeof m.t1 === 'number' ? m.t1 : null;
          const b = typeof m.t2 === 'number' ? m.t2 : null;
          const decided = m.w != null && weeks.every((w) => w <= last);
          const sum = (rid: number) => r2(weeks.reduce((t, w) => t + (pointsBy.get(`${w}:${rid}`) ?? 0), 0));
          const aPts = decided && a != null ? sum(a) : null;
          const bPts = decided && b != null ? sum(b) : null;
          const label = roundLabel(m, rounds, consolation);
          if (decided && a != null && b != null) {
            for (const w of weeks) {
              bracketWeekPlayed.add(`${w}:${a}`);
              bracketWeekPlayed.add(`${w}:${b}`);
            }
            const fa = rosterToF.get(a)!;
            const fb = rosterToF.get(b)!;
            const winnerF = m.w != null ? rosterToF.get(m.w) ?? null : null;
            const kind = consolation ? 'consolation' : m.p && m.p > 1 ? 'placement' : 'playoff';
            const id = `${season}-${consolation ? 'c' : 'p'}${m.m}`;
            games[id] = {
              id,
              season,
              week: weeks[0],
              kind,
              label,
              a: fa,
              b: fb,
              aPts: aPts!,
              bPts: bPts!,
              winner: winnerF,
            };
            gameOrder.push(id);
            seasonGameIds.push(id);
            if (kind === 'playoff') {
              for (const [rid, mine, theirs] of [
                [a, aPts!, bPts!],
                [b, bPts!, aPts!],
              ] as const) {
                const rec = playoffRecord.get(rid) ?? { w: 0, l: 0, pf: 0, pa: 0, games: 0 };
                rec.games++;
                rec.pf += mine;
                rec.pa += theirs;
                if (m.w === rid) rec.w++;
                else rec.l++;
                playoffRecord.set(rid, rec);
              }
            }
          }
          return {
            round: m.r,
            match: m.m,
            placement: m.p ?? null,
            label,
            a: a != null ? rosterToF.get(a) ?? null : null,
            b: b != null ? rosterToF.get(b) ?? null : null,
            aSeed: a != null ? rankOf.get(a) ?? null : null,
            bSeed: b != null ? rankOf.get(b) ?? null : null,
            aPts,
            bPts,
            winner: decided && m.w != null ? rosterToF.get(m.w) ?? null : null,
          };
        });
    };

    const bracket = processBracket(s.winners, false);
    const consolationBracket = processBracket(s.losers, true);

    let finalMatch = s.winners.find((m) => m.p === 1);
    if (!finalMatch && totalRounds > 0) {
      finalMatch = s.winners.find((m) => m.r === totalRounds && m.t1_from?.w != null && m.t2_from?.w != null);
    }
    const finalDecided = finalMatch && finalMatch.w != null && weeksForRound(finalMatch.r).every((w) => w <= last);
    const championR = finalDecided ? finalMatch!.w : null;
    const runnerUpR = finalDecided ? finalMatch!.l : null;
    const thirdMatch = s.winners.find((m) => m.p === 3);
    const thirdR = thirdMatch && thirdMatch.w != null && weeksForRound(thirdMatch.r).every((w) => w <= last) ? thirdMatch.w : null;

    // Final placements: bracket placement games first, then everyone else by rank.
    const finishOf = new Map<number, number>();
    if (state === 'complete') {
      for (const m of s.winners) {
        if (m.p && m.w != null && m.l != null) {
          finishOf.set(m.w, m.p);
          finishOf.set(m.l, m.p + 1);
        }
      }
      const taken = new Set(finishOf.values());
      let next = 1;
      const nextFree = () => {
        while (taken.has(next)) next++;
        taken.add(next);
        return next;
      };
      const ordered = standingsRaw.map((r) => r.rosterId);
      for (const rid of ordered) if (playoffRosters.has(rid) && !finishOf.has(rid)) finishOf.set(rid, nextFree());
      for (const rid of ordered) if (!finishOf.has(rid)) finishOf.set(rid, nextFree());
    }

    const resultOf = (rid: number): SeasonResult => {
      if (state === 'upcoming') return 'upcoming';
      if (championR === rid) return 'champion';
      if (runnerUpR === rid) return 'runner-up';
      if (thirdR === rid) return 'third';
      if (playoffRosters.has(rid)) return state === 'complete' ? 'playoffs' : 'in-progress';
      return state === 'complete' ? 'missed' : 'in-progress';
    };

    const maxPfInSeason = Math.max(0, ...standingsRaw.map((r) => r.pf));
    const standings: StandingRow[] = standingsRaw.map((r, i) => ({
      franchiseId: r.franchiseId,
      rosterId: r.rosterId,
      teamName: r.teamName,
      rank: i + 1,
      w: r.w,
      l: r.l,
      t: r.t,
      pf: r.pf,
      pa: r.pa,
      avgPF: r.weeks ? r2(r.pf / r.weeks) : 0,
      avgPA: r.weeks ? r2(r.pa / r.weeks) : 0,
      madePlayoffs: playoffRosters.has(r.rosterId),
      finish: finishOf.get(r.rosterId) ?? null,
      result: resultOf(r.rosterId),
    }));

    // ---- lineups: start/bench decisions, Hall of Fame, roster presence --------
    const slots = (s.league.roster_positions ?? []).filter((p) => !NON_STARTING.has(p));
    const seasonHof = new Map<string, Map<string, { points: number; starts: number }>>();
    let seasonHigh: SeasonModel['highScore'] = null;
    const sbBySeason = new Map<string, { decisions: number; correct: number }>();

    const weeks = [...s.matchups.keys()].filter((w) => w <= last).sort((a, b) => a - b);
    for (const w of weeks) {
      for (const m of s.matchups.get(w) ?? []) {
        const fid = rosterToF.get(m.roster_id);
        if (!fid) continue;
        const a = acc(fid);
        const startersArr = (m.starters ?? []).map((x) => (x ? String(x) : '0'));
        const starterSet = new Set(startersArr.filter((x) => x !== '0'));
        const rosterSet = new Set((m.players ?? []).filter((x) => x && x !== '0').map(String));
        const pp = m.players_points ?? {};
        const counted = w <= regularWeeks ? m.matchup_id != null : bracketWeekPlayed.has(`${w}:${m.roster_id}`);
        a.weekly.push({ season, week: w, players: rosterSet, starters: starterSet, pp, counted });
        if (!counted) continue;

        const teamPts = matchupPoints(m);
        if (!seasonHigh || teamPts > seasonHigh.points) seasonHigh = { franchiseId: fid, week: w, points: r2(teamPts) };

        // Hall of Fame tallies (points scored while in the starting lineup).
        let fh = seasonHof.get(fid);
        if (!fh) seasonHof.set(fid, (fh = new Map()));
        startersArr.forEach((pid, i) => {
          if (pid === '0') return;
          const p = m.starters_points?.[i] ?? pp[pid] ?? 0;
          const cur = fh!.get(pid) ?? { points: 0, starts: 0 };
          cur.points += p;
          cur.starts++;
          fh!.set(pid, cur);
          if (!bestPlayerGame || p > bestPlayerGame.points) {
            bestPlayerGame = { playerId: pid, name: nameOf(pid), pos: posOf(pid), points: r2(p), starts: 1, franchiseId: fid, season, week: w };
          }
        });

        // Start/bench: did each starter beat the best eligible bench player?
        const bench = [...rosterSet].filter((pid) => !starterSet.has(pid));
        const sb = sbBySeason.get(fid) ?? { decisions: 0, correct: 0 };
        slots.forEach((slot, i) => {
          const eligible = SLOT_ELIGIBILITY[slot];
          if (!eligible) return;
          const sid = startersArr[i] ?? '0';
          const sPts = sid !== '0' ? m.starters_points?.[i] ?? pp[sid] ?? 0 : 0;
          let bestId: string | null = null;
          let bestPts = -Infinity;
          for (const b of bench) {
            if (!eligibleOf(b).some((pos) => eligible.includes(pos))) continue;
            const bp = pp[b] ?? 0;
            if (bp > bestPts) {
              bestPts = bp;
              bestId = b;
            }
          }
          if (!bestId) return;
          sb.decisions++;
          a.decisions++;
          if (sPts >= bestPts) {
            sb.correct++;
            a.correct++;
          } else {
            a.blunders.push({
              season,
              week: w,
              slot,
              starterId: sid,
              starterName: nameOf(sid),
              starterPts: r2(sPts),
              benchId: bestId,
              benchName: nameOf(bestId),
              benchPts: r2(bestPts),
              cost: r2(bestPts - sPts),
            });
          }
        });
        sbBySeason.set(fid, sb);
      }
    }

    // ---- per-franchise season lines -----------------------------------------------
    for (const row of standings) {
      const a = acc(row.franchiseId);
      const raw = standingsRaw.find((r) => r.rosterId === row.rosterId)!;
      const hofMap = seasonHof.get(row.franchiseId) ?? new Map();
      a.hof.set(season, hofMap);
      const top: PlayerLine[] = [...hofMap.entries()]
        .map(([pid, v]) => ({ playerId: pid, name: nameOf(pid), pos: posOf(pid), points: r2(v.points), starts: v.starts }))
        .sort((x, y) => y.points - x.points)
        .slice(0, 3);
      const pr = playoffRecord.get(row.rosterId);
      if (pr) {
        a.playoffs.w += pr.w;
        a.playoffs.l += pr.l;
        a.playoffs.pf += pr.pf;
        a.playoffs.pa += pr.pa;
        a.playoffs.games += pr.games;
      }
      if (row.result === 'champion') a.titles.push(season);
      if (row.result === 'runner-up') a.runnerUps.push(season);
      if (row.result === 'third') a.thirds.push(season);
      if (row.madePlayoffs) a.playoffApps.push(season);
      if (regularComplete && state !== 'upcoming') {
        if (row.rank === 1) a.regularSeasonTitles.push(season);
        if (row.pf === maxPfInSeason && maxPfInSeason > 0) a.pointsTitles.push(season);
        if (row.rank === standings.length && standings.length > 1) a.lastPlaces.push(season);
      }
      const usersAvatar = a.avatar.full;
      a.seasons.push({
        season,
        rosterId: row.rosterId,
        teamName: row.teamName,
        avatarUrl: usersAvatar,
        w: row.w,
        l: row.l,
        t: row.t,
        pf: row.pf,
        pa: row.pa,
        weeks: raw.weeks,
        avgPF: row.avgPF,
        avgPA: row.avgPA,
        maxPF: raw.maxPF,
        rank: row.rank,
        finish: row.finish,
        result: row.result,
        playoffW: pr?.w ?? 0,
        playoffL: pr?.l ?? 0,
        startBench: sbBySeason.get(row.franchiseId) ?? { decisions: 0, correct: 0 },
        topPlayers: top,
      });
    }

    // Season MVP: best single-team starter total.
    let mvp: HofEntry | null = null;
    for (const [fid, map] of seasonHof) {
      for (const [pid, v] of map) {
        if (!mvp || v.points > mvp.points) {
          mvp = { playerId: pid, name: nameOf(pid), pos: posOf(pid), points: r2(v.points), starts: v.starts, season, franchiseId: fid };
        }
      }
    }

    // ---- trades ---------------------------------------------------------------------
    let tradeCount = 0;
    for (const tx of s.transactions) {
      if (tx.type !== 'trade' || tx.status !== 'complete') continue;
      tradeCount++;
      const sides: TradeSide[] = (tx.roster_ids ?? []).map((rid) => {
        const fid = rosterToF.get(rid) ?? `roster-${rid}`;
        const received = Object.entries(tx.adds ?? {})
          .filter(([, to]) => to === rid)
          .map(([pid]) => ({ playerId: pid, name: nameOf(pid), pos: posOf(pid), points: 0, starts: 0, weeks: 0 }));
        const picks = (tx.draft_picks ?? [])
          .filter((p) => p.owner_id === rid)
          .map((p) => ({ season: String(p.season), round: p.round, originalFranchiseId: rosterToF.get(p.roster_id) ?? null }));
        const faab = (tx.waiver_budget ?? []).filter((b) => b.receiver === rid).reduce((t, b) => t + b.amount, 0);
        return { franchiseId: fid, received, picks, faab, value: 0 };
      });
      trades.push({
        id: tx.transaction_id,
        season,
        week: tx.leg ?? 0,
        created: tx.created ?? 0,
        sides,
        winnerId: null,
        margin: 0,
      });
    }

    seasonModels.push({
      season,
      leagueId: s.league.league_id,
      name: s.league.name,
      status: s.league.status,
      state,
      weeksPlayed: Math.min(last, regularWeeks + totalRounds * (roundType === 2 ? 2 : 1) + (roundType === 1 ? 1 : 0)),
      regularWeeks,
      playoffWeekStart: ps,
      teams: s.rosters.length,
      playoffTeams: Number(settings.playoff_teams ?? playoffRosters.size ?? 0),
      standings,
      champion: championR != null ? rosterToF.get(championR) ?? null : null,
      runnerUp: runnerUpR != null ? rosterToF.get(runnerUpR) ?? null : null,
      third: thirdR != null ? rosterToF.get(thirdR) ?? null : null,
      bracket,
      consolation: consolationBracket,
      gameIds: seasonGameIds,
      mvp,
      highScore: seasonHigh,
      trades: tradeCount,
    });
  }

  // ---- trade values: starter points each side got from what it received ---------
  for (const trade of trades) {
    for (const side of trade.sides) {
      const a = accs.get(side.franchiseId);
      if (!a) continue;
      const start = a.weekly.findIndex(
        (e) => Number(e.season) > Number(trade.season) || (e.season === trade.season && e.week >= Math.max(1, trade.week)),
      );
      for (const item of side.received) {
        if (start < 0) continue;
        let seen = false;
        for (let i = start; i < a.weekly.length; i++) {
          const e = a.weekly[i];
          if (e.players.has(item.playerId)) {
            seen = true;
            item.weeks++;
            if (e.counted && e.starters.has(item.playerId)) {
              item.starts++;
              item.points += e.pp[item.playerId] ?? 0;
            }
          } else if (seen) break;
          else if (e.season !== trade.season || e.week > Math.max(1, trade.week) + 1) break;
        }
        item.points = r2(item.points);
      }
      side.value = r2(side.received.reduce((t, p) => t + p.points, 0));
    }
    const ranked = [...trade.sides].sort((x, y) => y.value - x.value);
    if (ranked.length >= 2) {
      trade.margin = r2(ranked[0].value - ranked[1].value);
      trade.winnerId = trade.margin > 0 ? ranked[0].franchiseId : null;
    }
  }
  trades.sort((x, y) => y.margin - x.margin || y.created - x.created);

  // ---- head-to-head pairs ---------------------------------------------------------
  gameOrder.sort((x, y) => {
    const gx = games[x];
    const gy = games[y];
    return Number(gx.season) - Number(gy.season) || gx.week - gy.week || x.localeCompare(y);
  });
  const pairs: Record<string, PairRecord> = {};
  for (const id of gameOrder) {
    const g = games[id];
    const key = pairKey(g.a, g.b);
    const [a, b] = key.split('|');
    const p = (pairs[key] ??= { key, a, b, games: 0, aWins: 0, bWins: 0, ties: 0, aPts: 0, bPts: 0, playoffGames: 0, gameIds: [] });
    const aPts = g.a === a ? g.aPts : g.bPts;
    const bPts = g.a === a ? g.bPts : g.aPts;
    p.games++;
    p.aPts = r2(p.aPts + aPts);
    p.bPts = r2(p.bPts + bPts);
    if (g.winner === a) p.aWins++;
    else if (g.winner === b) p.bWins++;
    else p.ties++;
    if (g.kind !== 'regular') p.playoffGames++;
    p.gameIds.push(id);
  }
  const lastMeeting = (p: PairRecord) => gameOrder.indexOf(p.gameIds[p.gameIds.length - 1]);
  const rivalryRank = (x: PairRecord, y: PairRecord) =>
    y.games - x.games ||
    Math.abs(x.aWins - x.bWins) - Math.abs(y.aWins - y.bWins) ||
    y.playoffGames - x.playoffGames ||
    lastMeeting(y) - lastMeeting(x);
  const rivalries = Object.values(pairs)
    .filter((p) => p.games >= 2)
    .sort(rivalryRank)
    .map((p) => p.key);

  // ---- franchises -------------------------------------------------------------------
  const latestSeason = input.seasons[input.seasons.length - 1]?.league.season ?? '';
  const franchises: Franchise[] = [...accs.values()].map((a) => {
    const played = a.seasons.filter((x) => x.result !== 'upcoming');
    const reg = played.reduce(
      (t, x) => ({ w: t.w + x.w, l: t.l + x.l, t: t.t + x.t, pf: t.pf + x.pf, pa: t.pa + x.pa, weeks: t.weeks + x.weeks }),
      { w: 0, l: 0, t: 0, pf: 0, pa: 0, weeks: 0 },
    );
    const gp = reg.w + reg.l + reg.t;
    const regular = {
      ...reg,
      pf: r2(reg.pf),
      pa: r2(reg.pa),
      winPct: gp ? (reg.w + reg.t / 2) / gp : 0,
      avgPF: reg.weeks ? r2(reg.pf / reg.weeks) : 0,
      avgPA: reg.weeks ? r2(reg.pa / reg.weeks) : 0,
    };
    const latest = a.names[a.names.length - 1]?.name ?? a.id;
    const nameHistory: Franchise['nameHistory'] = [];
    for (const n of a.names) {
      const prev = nameHistory[nameHistory.length - 1];
      if (prev && prev.name === n.name) prev.to = n.season;
      else nameHistory.push({ name: n.name, from: n.season, to: n.season });
    }
    const byPositionMap = new Map<string, HofEntry>();
    const bySeason: HofEntry[] = [];
    for (const [season, map] of a.hof) {
      let top: HofEntry | null = null;
      for (const [pid, v] of map) {
        const entry: HofEntry = { playerId: pid, name: nameOf(pid), pos: posOf(pid), points: r2(v.points), starts: v.starts, season, franchiseId: a.id };
        if (!top || entry.points > top.points) top = entry;
        const cur = byPositionMap.get(entry.pos);
        if (!cur || entry.points > cur.points) byPositionMap.set(entry.pos, entry);
      }
      if (top) bySeason.push(top);
    }
    const byPosition = [...byPositionMap.values()].sort((x, y) => {
      const ix = POSITION_ORDER.indexOf(x.pos);
      const iy = POSITION_ORDER.indexOf(y.pos);
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || y.points - x.points;
    });
    const playoffs = { ...a.playoffs, pf: r2(a.playoffs.pf), pa: r2(a.playoffs.pa) };
    const base = {
      titles: a.titles,
      runnerUps: a.runnerUps,
      thirds: a.thirds,
      playoffApps: a.playoffApps,
      playoffs,
      regularSeasonTitles: a.regularSeasonTitles,
      pointsTitles: a.pointsTitles,
      regular,
      lastPlaces: a.lastPlaces,
    };
    const lines = legacyLines(base);
    return {
      id: a.id,
      name: latest,
      manager: a.managers[a.managers.length - 1] ?? 'Unknown manager',
      managerHistory: a.managers,
      avatarUrl: a.avatar.full,
      avatarThumbUrl: a.avatar.thumb ?? a.avatar.full,
      abbr: abbreviate(latest),
      jerseyNumber: a.latestRosterId || 1,
      active: a.seasons.some((x) => x.season === latestSeason),
      firstSeason: a.seasons[0]?.season ?? '',
      lastSeason: a.seasons[a.seasons.length - 1]?.season ?? '',
      nameHistory,
      seasons: a.seasons,
      ...base,
      legacy: { score: legacyTotal(lines), rank: 0, lines },
      startBench: {
        decisions: a.decisions,
        correct: a.correct,
        rate: a.decisions ? a.correct / a.decisions : null,
        rank: null,
        blunders: uniqueBlunders(a.blunders).slice(0, 5),
      },
      hallOfFame: { byPosition, bySeason },
      rivalId: null,
      palette: fallbackPalette(a.id),
    } satisfies Franchise;
  });

  franchises.sort(
    (x, y) =>
      y.legacy.score - x.legacy.score ||
      y.titles.length - x.titles.length ||
      y.regular.winPct - x.regular.winPct ||
      y.regular.pf - x.regular.pf,
  );
  franchises.forEach((f, i) => (f.legacy.rank = i + 1));

  const sbRanked = franchises
    .filter((f) => f.startBench.rate != null && f.startBench.decisions >= 20)
    .sort((x, y) => (y.startBench.rate ?? 0) - (x.startBench.rate ?? 0));
  sbRanked.forEach((f, i) => (f.startBench.rank = i + 1));

  for (const f of franchises) {
    const mine = rivalries.map((k) => pairs[k]).filter((p) => p.a === f.id || p.b === f.id);
    const top = mine[0];
    f.rivalId = top ? (top.a === f.id ? top.b : top.a) : null;
  }

  // ---- league records ------------------------------------------------------------------
  const records: LeagueRecords = {
    highestScore: null,
    lowestScore: null,
    biggestBlowout: null,
    closestGame: null,
    mostPointsSeason: null,
    bestRecord: null,
    longestWinStreak: null,
    bestPlayerGame,
    bestPlayerSeason: null,
  };
  for (const id of gameOrder) {
    const g = games[id];
    for (const [fid, opp, p] of [
      [g.a, g.b, g.aPts],
      [g.b, g.a, g.bPts],
    ] as const) {
      if (!records.highestScore || p > records.highestScore.points) {
        records.highestScore = { franchiseId: fid, opponentId: opp, season: g.season, week: g.week, points: p, label: g.label };
      }
      if (g.kind === 'regular' && p > 0 && (!records.lowestScore || p < records.lowestScore.points)) {
        records.lowestScore = { franchiseId: fid, opponentId: opp, season: g.season, week: g.week, points: p, label: g.label };
      }
    }
    const margin = r2(Math.abs(g.aPts - g.bPts));
    if (!records.biggestBlowout || margin > records.biggestBlowout.margin) records.biggestBlowout = { gameId: id, margin };
    if (!records.closestGame || margin < records.closestGame.margin) records.closestGame = { gameId: id, margin };
  }
  const regularComplete = new Map(
    seasonModels.map((sm) => [sm.season, sm.state === 'complete' || sm.weeksPlayed >= sm.regularWeeks]),
  );
  for (const f of franchises) {
    for (const ts of f.seasons) {
      if (!regularComplete.get(ts.season)) continue;
      if (!records.mostPointsSeason || ts.pf > records.mostPointsSeason.pf) {
        records.mostPointsSeason = { franchiseId: f.id, season: ts.season, pf: ts.pf, weeks: ts.weeks };
      }
      const p = (ts.w + ts.t / 2) / Math.max(1, ts.w + ts.l + ts.t);
      const bp = records.bestRecord
        ? (records.bestRecord.w + records.bestRecord.t / 2) / Math.max(1, records.bestRecord.w + records.bestRecord.l + records.bestRecord.t)
        : -1;
      if (p > bp) records.bestRecord = { franchiseId: f.id, season: ts.season, w: ts.w, l: ts.l, t: ts.t };
    }
    for (const h of f.hallOfFame.bySeason) {
      if (!records.bestPlayerSeason || h.points > records.bestPlayerSeason.points) records.bestPlayerSeason = h;
    }
    let run = 0;
    let runStart: { season: string; week: number } | null = null;
    for (const id of gameOrder) {
      const g = games[id];
      if (g.kind === 'consolation' || (g.a !== f.id && g.b !== f.id)) continue;
      if (g.winner === f.id) {
        if (run === 0) runStart = { season: g.season, week: g.week };
        run++;
        if (!records.longestWinStreak || run > records.longestWinStreak.length) {
          records.longestWinStreak = { franchiseId: f.id, length: run, from: runStart!, to: { season: g.season, week: g.week } };
        }
      } else run = 0;
    }
  }

  const latest = input.seasons[input.seasons.length - 1]?.league;
  const rec = latest?.scoring_settings?.rec ?? 0;
  const scoring = rec >= 1 ? 'PPR' : rec >= 0.5 ? 'Half-PPR' : rec > 0 ? `${rec} PPR` : 'Standard';
  const positions = latest?.roster_positions ?? [];
  const leagueType = latest?.settings?.type === 2 ? 'Dynasty' : latest?.settings?.type === 1 ? 'Keeper' : 'Redraft';

  return {
    schema: MODEL_SCHEMA,
    leagueId: input.leagueId,
    rootLeagueId: input.seasons[0]?.league.league_id ?? input.leagueId,
    name: latest?.name ?? 'Fantasy league',
    avatarUrl: input.leagueAvatarUrl,
    source: input.source,
    playerDataAt: input.playerDataAt,
    nflState: input.nflState,
    format: {
      teams: latest?.total_rosters ?? franchises.length,
      playoffTeams: Number(latest?.settings?.playoff_teams ?? 0),
      scoring: positions.includes('SUPER_FLEX') ? `${scoring}, Superflex` : scoring,
      leagueType,
      rosterPositions: positions,
    },
    seasons: seasonModels,
    franchises,
    games,
    gameOrder,
    pairs,
    rivalries,
    trades,
    records,
    legacyWeights: LEGACY_WEIGHTS,
  };
}
