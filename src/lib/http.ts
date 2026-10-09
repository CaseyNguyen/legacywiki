import 'server-only';
import { NextResponse } from 'next/server';
import { buildState, getFreshLeagueModel, startBuild } from './league';
import type { LeagueModel } from './model/types';

/** JSON response with a Server-Timing header, so endpoint latency is visible in devtools and tests. */
export function json(data: unknown, t0: number, init: { status?: number; headers?: Record<string, string> } = {}) {
  const ms = performance.now() - t0;
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      'Cache-Control': 'no-store',
      'Server-Timing': `app;dur=${ms.toFixed(2)}`,
      'X-Response-Time': `${ms.toFixed(2)}ms`,
      ...init.headers,
    },
  });
}

/**
 * Runs `fn` against the cached league. If the league has not been built yet,
 * answers 202 with build progress instead of waiting on Sleeper.
 */
export async function withLeague(leagueId: string, t0: number, fn: (model: LeagueModel) => unknown) {
  const model = await getFreshLeagueModel(leagueId);
  if (!model) {
    const state = buildState(leagueId);
    if (state?.status === 'error') {
      return json({ status: 'error', error: state.error }, t0, { status: state.notFound ? 404 : 502 });
    }
    if (!state) void startBuild(leagueId);
    return json({ status: 'building', progress: state?.status === 'building' ? state.progress : null }, t0, { status: 202 });
  }
  const data = fn(model);
  if (data == null) return json({ status: 'error', error: 'Not found' }, t0, { status: 404 });
  return json(data, t0);
}
