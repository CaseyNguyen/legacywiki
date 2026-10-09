import { withLeague } from '@/lib/http';
import { seasonView } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ leagueId: string; season: string }> }) {
  const t0 = performance.now();
  const { leagueId, season } = await params;
  return withLeague(leagueId, t0, (model) => seasonView(model, season));
}
