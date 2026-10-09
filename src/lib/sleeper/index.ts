import { demoSource, isDemoLeague } from './demo';
import { liveSource } from './live';
import type { SleeperSource } from './types';

export function sourceFor(leagueId: string): SleeperSource {
  return isDemoLeague(leagueId) ? demoSource : liveSource;
}

/**
 * Accepts a Sleeper league link (sleeper.com/leagues/<id>/..., sleeper.app/...),
 * a bare league id, or "demo". Returns null when nothing usable is found.
 */
export function parseLeagueInput(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^demo$/i.test(text)) return 'demo';
  const fromUrl = text.match(/leagues?\/(\d{6,25})/i);
  if (fromUrl) return fromUrl[1];
  const bare = text.match(/^\d{6,25}$/);
  if (bare) return bare[0];
  return null;
}

export { isDemoLeague };
export type { SleeperSource };
