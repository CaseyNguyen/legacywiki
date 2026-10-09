import { after } from 'next/server';
import { json } from '@/lib/http';
import { buildState, getLeagueModel, startBuild } from '@/lib/league';

export const dynamic = 'force-dynamic';

/** Build progress for the loading screen. Starts a build if none is running. */
export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const model = await getLeagueModel(leagueId);
  if (model) return json({ status: 'ready', name: model.name, builtAt: model.builtAt }, t0);
  const state = buildState(leagueId);
  if (state?.status === 'error') return json({ status: 'error', error: state.error, notFound: state.notFound }, t0);
  if (!state && new URL(req.url).searchParams.get('start') === '1') {
    const work = startBuild(leagueId);
    after(() => work);
  }
  const fresh = buildState(leagueId);
  return json({ status: fresh ? 'building' : 'idle', progress: fresh?.status === 'building' ? fresh.progress : null }, t0);
}
