import { withLeague } from '@/lib/http';
import { legacyStandings } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** League summary plus Legacy Score standings (the default view). */
export async function GET(_req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  return withLeague(leagueId, t0, (model) => ({
    leagueId: model.leagueId,
    name: model.name,
    source: model.source,
    builtAt: model.builtAt,
    format: model.format,
    seasons: model.seasons.map((s) => ({
      season: s.season,
      state: s.state,
      champion: s.champion,
      runnerUp: s.runnerUp,
      weeksPlayed: s.weeksPlayed,
    })),
    teams: model.franchises.map((f) => ({
      id: f.id,
      name: f.name,
      manager: f.manager,
      active: f.active,
      avatarUrl: f.avatarUrl,
      palette: { primary: f.palette.primary, secondary: f.palette.secondary, accent: f.palette.accent },
    })),
    legacyStandings: legacyStandings(model),
    legacyWeights: model.legacyWeights,
  }));
}
