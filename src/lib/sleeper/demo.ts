import type {
  PlayerMap,
  SleeperBracketMatch,
  SleeperLeague,
  SleeperMatchup,
  SleeperNflState,
  SleeperRoster,
  SleeperSource,
  SleeperTransaction,
  SleeperUser,
} from './types';

/**
 * A deterministic, fictional league that mirrors Sleeper's response shapes.
 * It lets the app be explored (and tested) without a real league or network
 * access. Every team, manager and player here is invented sample data.
 */

export const DEMO_LEAGUE_ID = 'demo';
export const isDemoLeague = (id: string) => id === DEMO_LEAGUE_ID || id.startsWith('demo-');

const SEASONS = [2021, 2022, 2023, 2024, 2025, 2026];
const CURRENT_SEASON = 2026;
const CURRENT_WEEK = 5; // weeks 1–4 of the current season have been played
const REG_WEEKS = 14;
const PLAYOFF_START = 15;
const LAST_WEEK = 17;
const ROSTER_POSITIONS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'];
const NEEDS: Record<string, number> = { QB: 2, RB: 5, WR: 5, TE: 2, K: 1, DEF: 1 };

interface DemoTeam {
  userId: string;
  display: string;
  name: string;
  formerName?: { name: string; until: number };
  colors: [string, string, string];
  emblem: number;
  skill: number;
  rosterId: number;
  joined?: number;
  left?: number;
}

const TEAMS: DemoTeam[] = [
  { userId: '900000000000000001', display: 'mkessler', name: 'Harbor City Pelicans', colors: ['#0b3d5c', '#f2a900', '#ffffff'], emblem: 0, skill: 0.8, rosterId: 1 },
  { userId: '900000000000000002', display: 'dani_r', name: 'Tidewater Tritons', colors: ['#00767a', '#d3dbe0', '#0b1f2a'], emblem: 1, skill: 0.71, rosterId: 2 },
  { userId: '900000000000000003', display: 'big_tuna', name: 'Ironclad Bombers', formerName: { name: 'Tuna Melts', until: 2022 }, colors: ['#b3121b', '#151515', '#ececec'], emblem: 2, skill: 0.62, rosterId: 3 },
  { userId: '900000000000000004', display: 'jpark', name: 'Gridiron Gnomes', colors: ['#2e6b30', '#f4d35e', '#7a4b26'], emblem: 3, skill: 0.67, rosterId: 4 },
  { userId: '900000000000000005', display: 'coachlo', name: 'Fourth & Forever', colors: ['#4b2a8a', '#f0b323', '#ffffff'], emblem: 4, skill: 0.75, rosterId: 5 },
  { userId: '900000000000000006', display: 'the_wiz', name: 'Waiver Wire Wizards', colors: ['#1f4fbf', '#ff7a1a', '#ffffff'], emblem: 5, skill: 0.57, rosterId: 6 },
  { userId: '900000000000000007', display: 'tacolord', name: 'Taco Tuesday FC', colors: ['#e8742a', '#2f7d32', '#fff3d6'], emblem: 6, skill: 0.6, rosterId: 7 },
  { userId: '900000000000000008', display: 'raccoonking', name: 'Red Zone Raccoons', colors: ['#4a4f57', '#d7263d', '#f5f5f5'], emblem: 7, skill: 0.69, rosterId: 8 },
  { userId: '900000000000000009', display: 'swerve', name: 'Saturday Night Swervers', colors: ['#141414', '#ff4fa3', '#ffffff'], emblem: 8, skill: 0.64, rosterId: 9 },
  { userId: '900000000000000010', display: 'avy', name: 'Avalanche Alley', colors: ['#9bd3f0', '#0c2340', '#ffffff'], emblem: 9, skill: 0.55, rosterId: 10, left: 2022 },
  { userId: '900000000000000011', display: 'kidcomeback', name: 'Comeback Kids', colors: ['#1d5c3a', '#d4a017', '#ffffff'], emblem: 10, skill: 0.73, rosterId: 10, joined: 2023 },
];

const DEF_TEAMS: Array<[string, string]> = [
  ['AUS', 'Austin Armadillos'], ['BKN', 'Brooklyn Bridges'], ['CHA', 'Charlotte Hornets'], ['DSM', 'Des Moines Monarchs'],
  ['ELP', 'El Paso Coyotes'], ['FRE', 'Fresno Raisins'], ['HON', 'Honolulu Waves'], ['LBC', 'Long Beach Gulls'],
  ['MEM', 'Memphis Blues'], ['OKC', 'Oklahoma City Twisters'], ['OMA', 'Omaha Steaks'], ['POR', 'Portland Pioneers'],
  ['SAC', 'Sacramento Kings'], ['SAT', 'San Antonio Missions'],
];

const FIRST = [
  'Marcus', 'Tyrell', 'Jalen', 'Devin', 'Caleb', 'Andre', 'Brock', 'Cole', 'Darius', 'Elijah', 'Garrett', 'Isaiah',
  'Jaxon', 'Keenan', 'Malik', 'Nico', 'Omar', 'Quentin', 'Reggie', 'Silas', 'Trent', 'Ulysses', 'Vince', 'Wes',
  'Xavier', 'Zeke', 'Rashad', 'Dominic', 'Felix', 'Hollis', 'Kendrick', 'Luca', 'Mason', 'Orlando', 'Percy', 'Roman',
  'Amari', 'Bennett', 'Cyrus', 'Desmond', 'Emmitt', 'Fletcher', 'Gideon', 'Hendrix', 'Ignatius', 'Jameson', 'Knox',
  'Lorenzo', 'Montez', 'Nash', 'Odell', 'Pierce', 'Quincy', 'Rocco', 'Sterling', 'Tobias', 'Valentino', 'Wyatt',
  'Yusuf', 'Zion', 'Augustin', 'Booker', 'Clement', 'Dashiell', 'Ezra', 'Forrest',
];
const LAST = [
  'Halvorsen', 'Okafor', 'Brandt', 'Castellano', 'Delacroix', 'Ferro', 'Gaithers', 'Holloway', 'Ivers', 'Jessup',
  'Kowalczyk', 'Lindqvist', 'Mbeki', 'Nakamura', 'Oduya', 'Pruett', 'Quarles', 'Rourke', 'Sandoval', 'Thibodeaux',
  'Underhill', 'Varga', 'Whitlock', 'Yarbrough', 'Zelenko', 'Abernathy', 'Beaumont', 'Corrigan', 'Dunleavy', 'Esposito',
  'Fairweather', 'Galloway', 'Huxley', 'Iverson-Ruiz', 'Juneau', 'Kincaid', 'Lockhart', 'Mayweather-Shaw', 'Northcutt', 'Oyelaran',
];

const POS_PLAN: Array<{ pos: string; count: number; mean: number; spread: number; sd: number; lo: number; hi: number }> = [
  { pos: 'QB', count: 24, mean: 16.5, spread: 3.6, sd: 6.5, lo: 9, hi: 26 },
  { pos: 'RB', count: 60, mean: 9, spread: 4, sd: 6.5, lo: 3, hi: 21 },
  { pos: 'WR', count: 64, mean: 9, spread: 3.8, sd: 6.5, lo: 3, hi: 20 },
  { pos: 'TE', count: 24, mean: 6, spread: 3, sd: 4.5, lo: 2, hi: 15 },
  { pos: 'K', count: 14, mean: 8, spread: 1.3, sd: 3.5, lo: 5, hi: 11 },
];

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoPlayer {
  id: string;
  name: string;
  pos: string;
  base: number;
  sd: number;
  proTeam: number;
}

interface SeasonData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  matchups: Map<number, SleeperMatchup[]>;
  winners: SleeperBracketMatch[];
  losers: SleeperBracketMatch[];
  transactions: Map<number, SleeperTransaction[]>;
}

interface DemoWorld {
  seasons: Map<string, SeasonData>;
  players: PlayerMap;
}

const leagueIdFor = (season: number) => (season === CURRENT_SEASON ? DEMO_LEAGUE_ID : `demo-${season}`);
const round2 = (n: number) => Math.round(n * 100) / 100;

function splitPoints(total: number) {
  const whole = Math.floor(total + 1e-9);
  let dec = Math.round((total - whole) * 100);
  if (dec === 100) return { whole: whole + 1, dec: 0 };
  if (dec < 0) dec = 0;
  return { whole, dec };
}

function buildWorld(): DemoWorld {
  const rng = mulberry32(20211);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  // ---- player pool -------------------------------------------------------
  const pool: DemoPlayer[] = [];
  const usedNames = new Set<string>();
  let nextId = 4001;
  for (const plan of POS_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      let name = '';
      do name = `${pick(FIRST)} ${pick(LAST)}`;
      while (usedNames.has(name));
      usedNames.add(name);
      pool.push({
        id: String(nextId++),
        name,
        pos: plan.pos,
        base: clamp(plan.mean + gauss() * plan.spread, plan.lo, plan.hi),
        sd: plan.sd,
        proTeam: Math.floor(rng() * DEF_TEAMS.length),
      });
    }
  }
  DEF_TEAMS.forEach(([abbr, name], i) => {
    pool.push({ id: abbr, name: `${name}`, pos: 'DEF', base: clamp(7 + gauss() * 2, 3, 12), sd: 5.5, proTeam: i });
  });

  const players: PlayerMap = {};
  for (const p of pool) {
    players[p.id] = { n: p.pos === 'DEF' ? `${p.name} D/ST` : p.name, p: p.pos, t: DEF_TEAMS[p.proTeam][0] };
  }

  const seasons = new Map<string, SeasonData>();

  for (const season of SEASONS) {
    const teams = TEAMS.filter((t) => (t.joined ?? 0) <= season && (t.left ?? 9999) >= season).sort(
      (a, b) => a.rosterId - b.rosterId,
    );
    const rosterIds = teams.map((t) => t.rosterId);
    const teamByRoster = new Map(teams.map((t) => [t.rosterId, t]));
    const lastWeek = season === CURRENT_SEASON ? CURRENT_WEEK - 1 : LAST_WEEK;

    // Season form for every player, plus bye weeks by pro team.
    const mean = new Map<string, number>();
    for (const p of pool) mean.set(p.id, Math.max(1, p.base + gauss() * p.base * 0.2));
    const byeOfProTeam = DEF_TEAMS.map(() => 5 + Math.floor(rng() * 10));

    // Weekly actual points for every player.
    const actual = new Map<string, number[]>();
    for (const p of pool) {
      const weeks: number[] = [0];
      let injuredUntil = 0;
      for (let w = 1; w <= LAST_WEEK; w++) {
        if (w === byeOfProTeam[p.proTeam] && w <= REG_WEEKS) weeks.push(0);
        else if (w <= injuredUntil) weeks.push(0);
        else if (rng() < 0.025) {
          injuredUntil = w + 1 + Math.floor(rng() * 3);
          weeks.push(round2(Math.max(0, rng() * 3)));
        } else weeks.push(round2(Math.max(0, mean.get(p.id)! + gauss() * p.sd)));
      }
      actual.set(p.id, weeks);
    }

    // ---- snake draft -------------------------------------------------------
    const order = [...rosterIds].sort(() => rng() - 0.5);
    const rosterSets = new Map<number, string[]>(rosterIds.map((r) => [r, []]));
    const need = new Map<number, Record<string, number>>(rosterIds.map((r) => [r, { ...NEEDS }]));
    const available = new Set(pool.map((p) => p.id));
    const poolById = new Map(pool.map((p) => [p.id, p]));
    const rounds = Object.values(NEEDS).reduce((a, b) => a + b, 0);
    for (let round = 0; round < rounds; round++) {
      const seq = round % 2 === 0 ? order : [...order].reverse();
      for (const rid of seq) {
        const n = need.get(rid)!;
        let best: DemoPlayer | null = null;
        let bestScore = -Infinity;
        for (const id of available) {
          const p = poolById.get(id)!;
          if (!n[p.pos]) continue;
          let score = mean.get(id)! + gauss() * 2.5;
          if ((p.pos === 'K' || p.pos === 'DEF') && round < rounds - 3) score -= 30;
          if (p.pos === 'QB' && n.QB === 1 && round < 8) score -= 6;
          if (score > bestScore) {
            bestScore = score;
            best = p;
          }
        }
        if (!best) continue;
        available.delete(best.id);
        n[best.pos]--;
        rosterSets.get(rid)!.push(best.id);
      }
    }

    // ---- trades --------------------------------------------------------------
    const tradeWeeks = season === CURRENT_SEASON ? [3] : [3 + Math.floor(rng() * 3), 6 + Math.floor(rng() * 3), 9 + Math.floor(rng() * 3)];
    const transactions = new Map<number, SleeperTransaction[]>();
    const seasonStart = Date.UTC(season, 8, 7);

    const countPos = (ids: string[], pos: string) => ids.filter((id) => poolById.get(id)!.pos === pos).length;
    const tradeable = (ids: string[]) => ids.filter((id) => ['QB', 'RB', 'WR', 'TE'].includes(poolById.get(id)!.pos));
    const minimums: Record<string, number> = { QB: 1, RB: 3, WR: 3, TE: 1 };

    function makeTrade(week: number, idx: number) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const a = pick(rosterIds);
        const b = pick(rosterIds.filter((r) => r !== a));
        const aIds = rosterSets.get(a)!;
        const bIds = rosterSets.get(b)!;
        const give = pick(tradeable(aIds));
        const giveBackCount = rng() < 0.4 ? 2 : 1;
        const back: string[] = [];
        const candidates = tradeable(bIds).sort(() => rng() - 0.5);
        for (const c of candidates) {
          if (back.length >= giveBackCount) break;
          back.push(c);
        }
        if (!give || back.length === 0) continue;
        const aAfter = aIds.filter((x) => x !== give).concat(back);
        const bAfter = bIds.filter((x) => !back.includes(x)).concat(give);
        const ok = Object.entries(minimums).every(([pos, min]) => countPos(aAfter, pos) >= min && countPos(bAfter, pos) >= min);
        if (!ok) continue;
        rosterSets.set(a, aAfter);
        rosterSets.set(b, bAfter);
        const adds: Record<string, number> = { [give]: b };
        const drops: Record<string, number> = { [give]: a };
        for (const id of back) {
          adds[id] = a;
          drops[id] = b;
        }
        const draftPicks =
          rng() < 0.35
            ? [{ season: String(season + 1), round: 2 + Math.floor(rng() * 3), roster_id: b, previous_owner_id: b, owner_id: a }]
            : [];
        const faab = rng() < 0.25 ? [{ sender: a, receiver: b, amount: 5 + Math.floor(rng() * 20) }] : [];
        const tx: SleeperTransaction = {
          transaction_id: `${season}${String(week).padStart(2, '0')}${idx}${a}${b}`,
          type: 'trade',
          status: 'complete',
          leg: week,
          created: seasonStart + (week - 1) * 7 * 86400000 + 2 * 86400000,
          status_updated: seasonStart + (week - 1) * 7 * 86400000 + 2 * 86400000 + 3600000,
          roster_ids: [a, b],
          adds,
          drops,
          draft_picks: draftPicks,
          waiver_budget: faab,
          creator: teamByRoster.get(a)!.userId,
          consenter_ids: [a, b],
        };
        const list = transactions.get(week) ?? [];
        list.push(tx);
        transactions.set(week, list);
        return;
      }
    }

    // ---- schedule (circle method) ------------------------------------------
    const scheduleRounds: Array<Array<[number, number]>> = [];
    {
      const ids = [...rosterIds];
      const n = ids.length;
      for (let r = 0; r < n - 1; r++) {
        const pairs: Array<[number, number]> = [];
        for (let i = 0; i < n / 2; i++) pairs.push([ids[i], ids[n - 1 - i]]);
        scheduleRounds.push(pairs);
        ids.splice(1, 0, ids.pop()!);
      }
    }

    // ---- weekly lineups ------------------------------------------------------
    const lineups = new Map<number, Map<number, { starters: string[]; players: string[]; points: number }>>();
    const slotEligible: Record<string, string[]> = {
      QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], FLEX: ['RB', 'WR', 'TE'], K: ['K'], DEF: ['DEF'],
    };
    const starterSlots = ROSTER_POSITIONS.filter((s) => s !== 'BN');

    for (let w = 1; w <= lastWeek; w++) {
      tradeWeeks.forEach((tw, i) => {
        if (tw === w) makeTrade(w, i);
      });
      const weekMap = new Map<number, { starters: string[]; players: string[]; points: number }>();
      for (const rid of rosterIds) {
        const team = teamByRoster.get(rid)!;
        const ids = rosterSets.get(rid)!;
        const proj = new Map<string, number>();
        for (const id of ids) {
          const p = poolById.get(id)!;
          const onBye = w === byeOfProTeam[p.proTeam] && w <= REG_WEEKS;
          const knowsBye = rng() < team.skill + 0.15;
          const base = onBye && knowsBye ? 0 : mean.get(id)!;
          proj.set(id, base + gauss() * (1 - team.skill) * 9);
        }
        const used = new Set<string>();
        const starters: string[] = [];
        for (const slot of starterSlots) {
          const eligible = ids.filter((id) => !used.has(id) && slotEligible[slot].includes(poolById.get(id)!.pos));
          eligible.sort((x, y) => proj.get(y)! - proj.get(x)!);
          const choice = eligible[0];
          if (choice) {
            used.add(choice);
            starters.push(choice);
          } else starters.push('0');
        }
        const points = round2(starters.reduce((sum, id) => sum + (id === '0' ? 0 : actual.get(id)![w]), 0));
        weekMap.set(rid, { starters, players: [...ids], points });
      }
      lineups.set(w, weekMap);
    }

    // ---- regular season ------------------------------------------------------
    const rec = new Map<number, { w: number; l: number; t: number; pf: number; pa: number; ppts: number }>(
      rosterIds.map((r) => [r, { w: 0, l: 0, t: 0, pf: 0, pa: 0, ppts: 0 }]),
    );
    const matchupIds = new Map<number, Map<number, number | null>>();
    for (let w = 1; w <= Math.min(REG_WEEKS, lastWeek); w++) {
      const ids = new Map<number, number | null>();
      scheduleRounds[(w - 1) % scheduleRounds.length].forEach(([a, b], i) => {
        ids.set(a, i + 1);
        ids.set(b, i + 1);
        const pa = lineups.get(w)!.get(a)!.points;
        const pb = lineups.get(w)!.get(b)!.points;
        const ra = rec.get(a)!;
        const rb = rec.get(b)!;
        ra.pf += pa;
        ra.pa += pb;
        rb.pf += pb;
        rb.pa += pa;
        if (pa > pb) {
          ra.w++;
          rb.l++;
        } else if (pb > pa) {
          rb.w++;
          ra.l++;
        } else {
          ra.t++;
          rb.t++;
        }
      });
      matchupIds.set(w, ids);
    }

    // ---- playoffs ------------------------------------------------------------
    const winners: SleeperBracketMatch[] = [];
    const losers: SleeperBracketMatch[] = [];
    if (season !== CURRENT_SEASON) {
      const seeds = [...rosterIds].sort((a, b) => {
        const ra = rec.get(a)!;
        const rb = rec.get(b)!;
        return rb.w + rb.t / 2 - (ra.w + ra.t / 2) || rb.pf - ra.pf;
      });
      const pts = (rid: number, w: number) => lineups.get(w)!.get(rid)!.points;
      const play = (r: number, m: number, t1: number, t2: number, week: number, p?: number, from?: Partial<SleeperBracketMatch>) => {
        const a = pts(t1, week);
        const b = pts(t2, week);
        const w = a >= b ? t1 : t2;
        const l = w === t1 ? t2 : t1;
        return { r, m, t1, t2, w, l, ...(p ? { p } : {}), ...from } as SleeperBracketMatch;
      };
      const s = (n: number) => seeds[n - 1];
      const m1 = play(1, 1, s(3), s(6), 15);
      const m2 = play(1, 2, s(4), s(5), 15);
      const m3 = play(2, 3, s(1), m2.w!, 16, undefined, { t2_from: { w: 2 } });
      const m4 = play(2, 4, s(2), m1.w!, 16, undefined, { t2_from: { w: 1 } });
      const m5 = play(2, 5, m1.l!, m2.l!, 16, 5, { t1_from: { l: 1 }, t2_from: { l: 2 } });
      const m6 = play(3, 6, m3.w!, m4.w!, 17, 1, { t1_from: { w: 3 }, t2_from: { w: 4 } });
      const m7 = play(3, 7, m3.l!, m4.l!, 17, 3, { t1_from: { l: 3 }, t2_from: { l: 4 } });
      winners.push(m1, m2, m3, m4, m5, m6, m7);
      const l1 = play(1, 1, s(7), s(10), 15);
      const l2 = play(1, 2, s(8), s(9), 15);
      const l3 = play(2, 3, l1.l!, l2.l!, 16, 1, { t1_from: { l: 1 }, t2_from: { l: 2 } });
      const l4 = play(2, 4, l1.w!, l2.w!, 16, 3, { t1_from: { w: 1 }, t2_from: { w: 2 } });
      losers.push(l1, l2, l3, l4);
      const games: Array<[number, SleeperBracketMatch[]]> = [
        [15, [m1, m2, l1, l2]],
        [16, [m3, m4, m5, l3, l4]],
        [17, [m6, m7]],
      ];
      for (const [week, list] of games) {
        const ids = new Map<number, number | null>(rosterIds.map((r) => [r, null]));
        list.forEach((g, i) => {
          ids.set(g.t1!, i + 1);
          ids.set(g.t2!, i + 1);
        });
        matchupIds.set(week, ids);
      }
    }

    // Potential points (best possible lineup) for the regular season.
    for (let w = 1; w <= Math.min(REG_WEEKS, lastWeek); w++) {
      for (const rid of rosterIds) {
        const lu = lineups.get(w)!.get(rid)!;
        const used = new Set<string>();
        let best = 0;
        for (const slot of starterSlots) {
          const eligible = lu.players.filter((id) => !used.has(id) && slotEligible[slot].includes(poolById.get(id)!.pos));
          eligible.sort((x, y) => actual.get(y)![w] - actual.get(x)![w]);
          if (eligible[0]) {
            used.add(eligible[0]);
            best += actual.get(eligible[0])![w];
          }
        }
        rec.get(rid)!.ppts += best;
      }
    }

    // ---- assemble Sleeper-shaped responses ------------------------------------
    const league: SleeperLeague = {
      league_id: leagueIdFor(season),
      name: 'Sunday Scaries League',
      season: String(season),
      status: season === CURRENT_SEASON ? 'in_season' : 'complete',
      sport: 'nfl',
      season_type: 'regular',
      total_rosters: rosterIds.length,
      previous_league_id: season === SEASONS[0] ? null : leagueIdFor(season - 1),
      avatar: null,
      roster_positions: ROSTER_POSITIONS,
      scoring_settings: { rec: 1, pass_td: 4, pass_yd: 0.04, rush_yd: 0.1, rec_yd: 0.1, rush_td: 6, rec_td: 6 },
      settings: {
        playoff_week_start: PLAYOFF_START,
        playoff_teams: 6,
        playoff_round_type: 0,
        last_scored_leg: lastWeek,
        num_teams: rosterIds.length,
        type: 0,
      },
    };

    const users: SleeperUser[] = teams.map((t) => ({
      user_id: t.userId,
      username: t.display,
      display_name: t.display,
      avatar: null,
      is_owner: t.rosterId === 1,
      metadata: {
        team_name: t.formerName && season <= t.formerName.until ? t.formerName.name : t.name,
        avatar: `/api/demo/avatar/${t.emblem}`,
      },
    }));

    const finalWeek = lastWeek;
    const rosters: SleeperRoster[] = rosterIds.map((rid) => {
      const r = rec.get(rid)!;
      const pf = splitPoints(r.pf);
      const pa = splitPoints(r.pa);
      const pp = splitPoints(r.ppts);
      const current = rosterSets.get(rid)!;
      const last = lineups.get(finalWeek)?.get(rid);
      return {
        roster_id: rid,
        owner_id: teamByRoster.get(rid)!.userId,
        co_owners: null,
        league_id: league.league_id,
        players: current,
        starters: last?.starters ?? [],
        reserve: [],
        taxi: null,
        settings: {
          wins: r.w,
          losses: r.l,
          ties: r.t,
          fpts: pf.whole,
          fpts_decimal: pf.dec,
          fpts_against: pa.whole,
          fpts_against_decimal: pa.dec,
          ppts: pp.whole,
          ppts_decimal: pp.dec,
          division: 0,
        },
        metadata: null,
      };
    });

    const matchups = new Map<number, SleeperMatchup[]>();
    for (let w = 1; w <= lastWeek; w++) {
      const ids = matchupIds.get(w);
      matchups.set(
        w,
        rosterIds.map((rid) => {
          const lu = lineups.get(w)!.get(rid)!;
          const playersPoints: Record<string, number> = {};
          for (const id of lu.players) playersPoints[id] = actual.get(id)![w];
          return {
            roster_id: rid,
            matchup_id: ids?.get(rid) ?? null,
            points: lu.points,
            custom_points: null,
            starters: lu.starters,
            starters_points: lu.starters.map((id) => (id === '0' ? 0 : actual.get(id)![w])),
            players: lu.players,
            players_points: playersPoints,
          };
        }),
      );
    }

    seasons.set(league.league_id, { league, users, rosters, matchups, winners, losers, transactions });
  }

  return { seasons, players };
}

let world: DemoWorld | null = null;
const getWorld = () => (world ??= buildWorld());

export const demoSource: SleeperSource = {
  kind: 'demo',
  async league(id) {
    return getWorld().seasons.get(id)?.league ?? null;
  },
  async users(id) {
    return getWorld().seasons.get(id)?.users ?? [];
  },
  async rosters(id) {
    return getWorld().seasons.get(id)?.rosters ?? [];
  },
  async matchups(id, week) {
    return getWorld().seasons.get(id)?.matchups.get(week) ?? [];
  },
  async winnersBracket(id) {
    return getWorld().seasons.get(id)?.winners ?? [];
  },
  async losersBracket(id) {
    return getWorld().seasons.get(id)?.losers ?? [];
  },
  async transactions(id, week) {
    return getWorld().seasons.get(id)?.transactions.get(week) ?? [];
  },
  async nflState(): Promise<SleeperNflState> {
    return { week: CURRENT_WEEK, season: String(CURRENT_SEASON), season_type: 'regular', display_week: CURRENT_WEEK };
  },
  async players() {
    return { players: getWorld().players, fetchedAt: null };
  },
  avatarUrl(user) {
    const a = user?.metadata?.avatar;
    return typeof a === 'string' ? a : null;
  },
  leagueAvatarUrl() {
    return null;
  },
};

// ---- demo team logos ----------------------------------------------------------

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const EMBLEMS: Array<(fg: string, accent: string) => string> = [
  (fg, ac) => `<path d="M60 150 L128 92 L196 150 L196 180 L128 122 L60 180 Z" fill="${fg}"/><path d="M84 196 L128 158 L172 196 Z" fill="${ac}"/>`,
  (fg, ac) => `<path d="M120 196 V128 H82 V78 L92 70 L102 78 V112 H120 V64 L128 54 L136 64 V112 H154 V78 L164 70 L174 78 V128 H136 V196 Z" fill="${fg}"/><circle cx="128" cy="200" r="10" fill="${ac}"/>`,
  (fg, ac) => `<path d="M146 50 L82 142 H122 L104 206 L176 104 H134 Z" fill="${fg}"/><circle cx="182" cy="70" r="12" fill="${ac}"/>`,
  (fg, ac) => `<path d="M128 46 L184 168 H72 Z" fill="${fg}"/><circle cx="128" cy="188" r="24" fill="${ac}"/>`,
  (fg, ac) => `<path d="${starPath(128, 132, 82, 34)}" fill="${fg}"/><circle cx="128" cy="134" r="18" fill="${ac}"/>`,
  (fg, ac) => `<path d="M128 44 L182 182 H74 Z" fill="${fg}"/><path d="${starPath(128, 130, 24, 10)}" fill="${ac}"/>`,
  (fg, ac) => `<path d="M52 168 A76 76 0 0 1 204 168 Z" fill="${fg}"/><path d="M70 160 Q92 132 112 158 T156 156 T190 158" stroke="${ac}" stroke-width="12" fill="none"/>`,
  (fg, ac) => `<path d="M52 124 Q128 62 204 124 Q172 168 128 144 Q84 168 52 124 Z" fill="${fg}"/><circle cx="100" cy="124" r="13" fill="${ac}"/><circle cx="156" cy="124" r="13" fill="${ac}"/>`,
  (fg, ac) => `<path d="M156 54 A78 78 0 1 0 156 202 A60 60 0 1 1 156 54 Z" fill="${fg}"/><path d="${starPath(170, 112, 22, 9)}" fill="${ac}"/>`,
  (fg, ac) => `<path d="M44 186 L102 92 L132 136 L162 98 L212 186 Z" fill="${fg}"/><path d="M102 92 L118 118 L90 120 Z" fill="${ac}"/>`,
  (fg, ac) => `<path d="M128 52 L188 122 H150 V198 H106 V122 H68 Z" fill="${fg}"/><rect x="106" y="176" width="44" height="12" fill="${ac}"/>`,
];

export function demoAvatarSvg(index: number): string | null {
  const team = TEAMS.find((t) => t.emblem === index);
  if (!team) return null;
  const [bg, fg, accent] = team.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><rect width="256" height="256" fill="${bg}"/><circle cx="128" cy="128" r="108" fill="none" stroke="${fg}" stroke-width="10"/>${EMBLEMS[index](fg, accent)}</svg>`;
}
