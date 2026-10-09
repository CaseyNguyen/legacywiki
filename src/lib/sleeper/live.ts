import { store } from '../store';
import { createLimiter, dedupe, metrics, sleep } from '../runtime';
import { getPlayerMap } from './players';
import type {
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
 * Live Sleeper client.
 * - Completed seasons never change, so their responses are stored permanently
 *   and never requested again.
 * - In-progress data is cached in memory for a few minutes.
 * - Identical concurrent requests are collapsed, and at most 10 run at once.
 */

const BASE = process.env.SLEEPER_API_BASE || 'https://api.sleeper.app/v1';
const LIVE_TTL_MS = 5 * 60 * 1000;
const STATE_TTL_MS = 30 * 60 * 1000;
const limit = createLimiter(10);

class SleeperHttpError extends Error {
  constructor(
    public status: number,
    path: string,
  ) {
    super(`Sleeper returned ${status} for ${path}`);
  }
}

async function fetchJson<T>(path: string): Promise<T | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      metrics.sleeperRequests++;
      const res = await fetch(`${BASE}${path}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
        headers: { accept: 'application/json' },
      });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) throw new SleeperHttpError(res.status, path);
      if (!res.ok) throw new SleeperHttpError(res.status, path);
      const text = await res.text();
      if (!text || text === 'null') return null;
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof SleeperHttpError && err.status < 500 && err.status !== 429) break;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Sleeper request failed: ${path}`);
}

async function cached<T>(path: string, immutable: boolean, fallback: T, ttl = LIVE_TTL_MS): Promise<T> {
  if (immutable) {
    const hit = await store.get<T>('sleeper', path);
    if (hit) return hit.value;
  } else {
    const hit = store.peek<T>('sleeper-live', path);
    if (hit && Date.now() - hit.savedAt < ttl) return hit.value;
  }
  return dedupe(`sleeper:${path}`, async () => {
    const value = (await limit(() => fetchJson<T>(path))) ?? fallback;
    if (immutable) await store.set('sleeper', path, value);
    else await store.set('sleeper-live', path, value, { memoryOnly: true });
    return value;
  });
}

export const liveSource: SleeperSource = {
  kind: 'live',

  async league(id) {
    const path = `/league/${encodeURIComponent(id)}`;
    const frozen = await store.get<SleeperLeague>('sleeper', path);
    if (frozen) return frozen.value;
    const hot = store.peek<SleeperLeague | null>('sleeper-live', path);
    if (hot && Date.now() - hot.savedAt < LIVE_TTL_MS) return hot.value;
    return dedupe(`sleeper:${path}`, async () => {
      const league = await limit(() => fetchJson<SleeperLeague>(path));
      if (league?.status === 'complete') await store.set('sleeper', path, league);
      else await store.set('sleeper-live', path, league, { memoryOnly: true });
      return league;
    });
  },

  users: (id, immutable) => cached<SleeperUser[]>(`/league/${id}/users`, immutable, []),
  rosters: (id, immutable) => cached<SleeperRoster[]>(`/league/${id}/rosters`, immutable, []),
  matchups: (id, week, immutable) => cached<SleeperMatchup[]>(`/league/${id}/matchups/${week}`, immutable, []),
  winnersBracket: (id, immutable) => cached<SleeperBracketMatch[]>(`/league/${id}/winners_bracket`, immutable, []),
  losersBracket: (id, immutable) => cached<SleeperBracketMatch[]>(`/league/${id}/losers_bracket`, immutable, []),
  transactions: (id, week, immutable) =>
    cached<SleeperTransaction[]>(`/league/${id}/transactions/${week}`, immutable, []),

  async nflState() {
    const state = await cached<SleeperNflState | null>('/state/nfl', false, null, STATE_TTL_MS);
    if (state) return state;
    const year = String(new Date().getFullYear());
    return { week: 1, season: year, season_type: 'pre' };
  },

  players: () => getPlayerMap(),

  avatarUrl(user, size) {
    if (!user) return null;
    const custom = user.metadata?.avatar;
    if (typeof custom === 'string' && /^https?:\/\//.test(custom)) return custom;
    if (!user.avatar) return null;
    return size === 'thumb'
      ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
      : `https://sleepercdn.com/avatars/${user.avatar}`;
  },

  leagueAvatarUrl(league) {
    return league.avatar ? `https://sleepercdn.com/avatars/${league.avatar}` : null;
  },
};
