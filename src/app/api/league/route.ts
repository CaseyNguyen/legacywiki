import { after } from 'next/server';
import { json } from '@/lib/http';
import { buildState, clearBuildError, getLeagueModel, startBuild } from '@/lib/league';
import { parseLeagueInput, sourceFor } from '@/lib/sleeper';

export const dynamic = 'force-dynamic';

/**
 * POST { input: "<league link or id>" }
 * Validates the league with one Sleeper call, then starts building it in the
 * background. Returns immediately; poll /api/league/:id/status for progress.
 */
export async function POST(req: Request) {
  const t0 = performance.now();
  let body: { input?: string; leagueId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const leagueId = parseLeagueInput(body.leagueId ?? body.input ?? '');
  if (!leagueId) {
    return json(
      { status: 'error', error: 'Paste a Sleeper league link (it contains /leagues/ and a long number) or the league ID.' },
      t0,
      { status: 400 },
    );
  }

  const existing = await getLeagueModel(leagueId);
  if (existing) return json({ status: 'ready', leagueId, name: existing.name }, t0);

  clearBuildError(leagueId);
  let name: string | null = null;
  if (!buildState(leagueId)) {
    try {
      const league = await sourceFor(leagueId).league(leagueId);
      if (!league) {
        return json({ status: 'error', error: `Sleeper has no league with ID ${leagueId}. Check the link and try again.` }, t0, {
          status: 404,
        });
      }
      name = league.name;
    } catch (err) {
      return json({ status: 'error', error: `Could not reach Sleeper: ${(err as Error).message}` }, t0, { status: 502 });
    }
    const work = startBuild(leagueId);
    after(() => work);
  }
  return json({ status: 'building', leagueId, name }, t0, { status: 202 });
}
