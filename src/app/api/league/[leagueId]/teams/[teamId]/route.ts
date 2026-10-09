import { withLeague } from '@/lib/http';
import { teamView } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** Everything on a team's article: seasons, Hall of Fame, start/bench, opponents, trades, palette. */
export async function GET(_req: Request, { params }: { params: Promise<{ leagueId: string; teamId: string }> }) {
  const t0 = performance.now();
  const { leagueId, teamId } = await params;
  return withLeague(leagueId, t0, (model) => teamView(model, decodeURIComponent(teamId)));
}
