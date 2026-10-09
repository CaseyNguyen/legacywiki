import { json } from '@/lib/http';
import { getPlayerMap, playerCacheStatus } from '@/lib/sleeper/players';

export const dynamic = 'force-dynamic';

/**
 * Player cache status, or ?id=<playerId> for one player. Reading a player uses
 * the daily cache; Sleeper is only contacted when the copy is over 24 hours old.
 */
export async function GET(req: Request) {
  const t0 = performance.now();
  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const { players, fetchedAt } = await getPlayerMap();
    const player = players[id];
    return json(player ? { id, ...player, fetchedAt } : { error: 'Unknown player' }, t0, { status: player ? 200 : 404 });
  }
  return json(await playerCacheStatus(), t0);
}
