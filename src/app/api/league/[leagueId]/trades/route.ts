import { withLeague } from '@/lib/http';
import { tradesFor } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** Trades ranked by value gained. Optional ?season=YYYY and ?team=<teamId>. */
export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const url = new URL(req.url);
  return withLeague(leagueId, t0, (model) => ({
    trades: tradesFor(model, {
      season: url.searchParams.get('season') ?? undefined,
      team: url.searchParams.get('team') ?? undefined,
    }),
  }));
}
