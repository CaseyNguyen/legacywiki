import { withLeague } from '@/lib/http';
import { headToHead, teamById } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** ?a=<teamId>&b=<teamId> — series record, splits, streaks and the full game log. */
export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const url = new URL(req.url);
  const a = url.searchParams.get('a') ?? '';
  const b = url.searchParams.get('b') ?? '';
  return withLeague(leagueId, t0, (model) => (teamById(model, a) && teamById(model, b) && a !== b ? headToHead(model, a, b) : null));
}
