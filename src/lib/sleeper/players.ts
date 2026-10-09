import { store } from '../store';
import { dedupe, metrics } from '../runtime';
import type { CompactPlayer, PlayerMap, SleeperPlayer } from './types';

/**
 * Player database cache. Sleeper asks clients to download /players/nfl (~5 MB)
 * at most once a day, so the trimmed map is kept in memory and on disk and only
 * refreshed when it is more than 24 hours old. Concurrent requests share one
 * download, and a failed refresh keeps serving yesterday's copy.
 */

const NS = 'players';
const KEY = 'nfl';
export const PLAYER_TTL_MS = 24 * 60 * 60 * 1000;

const BASE = process.env.SLEEPER_API_BASE || 'https://api.sleeper.app/v1';

function compact(raw: Record<string, SleeperPlayer>): PlayerMap {
  const out: PlayerMap = {};
  for (const [id, p] of Object.entries(raw)) {
    if (!p) continue;
    const name =
      p.full_name ||
      [p.first_name, p.last_name].filter(Boolean).join(' ') ||
      (p.position === 'DEF' ? `${p.team ?? id} Defense` : id);
    const pos = p.position || p.fantasy_positions?.[0] || '';
    const entry: CompactPlayer = { n: name, p: pos };
    const fp = (p.fantasy_positions ?? []).filter(Boolean);
    if (fp.length && !(fp.length === 1 && fp[0] === pos)) entry.f = fp;
    if (p.team) entry.t = p.team;
    out[id] = entry;
  }
  return out;
}

export async function getPlayerMap(): Promise<{ players: PlayerMap; fetchedAt: number | null }> {
  const cached = await store.get<PlayerMap>(NS, KEY);
  if (cached && Date.now() - cached.savedAt < PLAYER_TTL_MS) {
    return { players: cached.value, fetchedAt: cached.savedAt };
  }
  try {
    return await dedupe('players:nfl', async () => {
      metrics.playerDownloads++;
      const res = await fetch(`${BASE}/players/nfl`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Sleeper players request failed (${res.status})`);
      const raw = (await res.json()) as Record<string, SleeperPlayer>;
      const players = compact(raw);
      const entry = await store.set(NS, KEY, players);
      return { players, fetchedAt: entry.savedAt };
    });
  } catch (err) {
    console.warn('[players] refresh failed:', (err as Error).message);
    if (cached) return { players: cached.value, fetchedAt: cached.savedAt };
    return { players: {}, fetchedAt: null };
  }
}

export async function playerCacheStatus() {
  const cached = await store.get<PlayerMap>(NS, KEY);
  return {
    cached: Boolean(cached),
    count: cached ? Object.keys(cached.value).length : 0,
    fetchedAt: cached?.savedAt ?? null,
    expiresAt: cached ? cached.savedAt + PLAYER_TTL_MS : null,
  };
}
