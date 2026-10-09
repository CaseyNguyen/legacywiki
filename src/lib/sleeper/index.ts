import { demoSource, isDemoLeague } from './demo';
import { liveSource } from './live';
import type { SleeperSource } from './types';

export function sourceFor(leagueId: string): SleeperSource {
  return isDemoLeague(leagueId) ? demoSource : liveSource;
}

export { isDemoLeague };
export type { SleeperSource };
