import { withLeague } from '@/lib/http';
import { legacyStandings } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** ?season=YYYY for that season's table; no season for all-time Legacy Score standings. */
export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const season = new URL(req.url).searchParams.get('season');
  return withLeague(leagueId, t0, (model) => {
    if (!season) return { kind: 'legacy', rows: legacyStandings(model) };
    const s = model.seasons.find((x) => x.season === season);
    return s ? { kind: 'season', season, state: s.state, rows: s.standings } : null;
  });
}
