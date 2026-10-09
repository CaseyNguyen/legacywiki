import { after } from 'next/server';
import { json } from '@/lib/http';
import { getLeagueModel } from '@/lib/league';
import { requestStory } from '@/lib/story';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ leagueId: string; teamId: string }> };

async function handle(leagueId: string, teamId: string, retry: boolean) {
  const t0 = performance.now();
  const model = await getLeagueModel(leagueId);
  if (!model) return json({ status: 'error', error: 'League is not built yet' }, t0, { status: 409 });
  try {
    const { response, work } = await requestStory(model, decodeURIComponent(teamId), { retry });
    // Generation runs after the response is sent, so this endpoint stays fast.
    if (work) after(() => work);
    return json(response, t0, { status: response.status === 'pending' ? 202 : 200 });
  } catch (err) {
    return json({ status: 'error', error: (err as Error).message }, t0, { status: 404 });
  }
}

/** Returns the team's story, starting its one-time generation if needed. */
export async function GET(_req: Request, { params }: Ctx) {
  const { leagueId, teamId } = await params;
  return handle(leagueId, teamId, false);
}

/** POST { retry: true } re-attempts only a generation that previously failed. */
export async function POST(req: Request, { params }: Ctx) {
  const { leagueId, teamId } = await params;
  let retry = false;
  try {
    retry = Boolean((await req.json())?.retry);
  } catch {
    /* no body */
  }
  return handle(leagueId, teamId, retry);
}
