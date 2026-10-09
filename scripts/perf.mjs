#!/usr/bin/env node
// Times every JSON endpoint of a running LegacyWiki server against the 200 ms budget
// and prints the call counters (Sleeper requests, player downloads, story calls, palettes).
//
// Usage: npm run perf -- [leagueId=demo] [baseUrl=http://localhost:3000] [runs=20]

const [leagueId = 'demo', base = 'http://localhost:3000', runsArg = '20'] = process.argv.slice(2);
const runs = Math.max(1, Number(runsArg) || 20);
const BUDGET_MS = 200;

async function get(path, init) {
  const t = performance.now();
  const res = await fetch(base + path, init);
  const body = await res.json().catch(() => null);
  return { ms: performance.now() - t, status: res.status, body };
}

async function ensureBuilt() {
  await get('/api/league', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ leagueId }),
  });
  const started = Date.now();
  for (;;) {
    const { body } = await get(`/api/league/${leagueId}/status?start=1`);
    if (body?.status === 'ready') return Date.now() - started;
    if (body?.status === 'error') throw new Error(body.error);
    if (Date.now() - started > 180_000) throw new Error('League build timed out');
    await new Promise((r) => setTimeout(r, 500));
  }
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];

async function main() {
  const buildMs = await ensureBuilt();
  console.log(`League ${leagueId} ready (waited ${buildMs} ms for the one-time build).\n`);
  const { body: summary } = await get(`/api/league/${leagueId}`);
  const [a, b] = summary.teams.map((t) => t.id);
  const season = summary.seasons[summary.seasons.length - 1].season;
  const endpoints = [
    `/api/league/${leagueId}`,
    `/api/league/${leagueId}/standings`,
    `/api/league/${leagueId}/standings?season=${season}`,
    `/api/league/${leagueId}/teams/${a}`,
    `/api/league/${leagueId}/seasons/${season}`,
    `/api/league/${leagueId}/h2h?a=${a}&b=${b}`,
    `/api/league/${leagueId}/compare?a=${a}&b=${b}`,
    `/api/league/${leagueId}/trades`,
    `/api/players`,
    `/api/health`,
  ];

  let failed = false;
  console.log('endpoint'.padEnd(64), 'p50 ms'.padStart(8), 'p95 ms'.padStart(8), 'max ms'.padStart(8));
  for (const path of endpoints) {
    const times = [];
    for (let i = 0; i < runs; i++) {
      const r = await get(path);
      if (r.status !== 200) throw new Error(`${path} returned ${r.status}`);
      times.push(r.ms);
    }
    times.sort((x, y) => x - y);
    const p95 = pct(times, 0.95);
    const ok = p95 < BUDGET_MS;
    failed ||= !ok;
    console.log(
      path.slice(0, 63).padEnd(64),
      pct(times, 0.5).toFixed(1).padStart(8),
      p95.toFixed(1).padStart(8),
      times[times.length - 1].toFixed(1).padStart(8),
      ok ? '' : `  over ${BUDGET_MS} ms`,
    );
  }
  const { body: health } = await get('/api/health');
  console.log('\nCall counters since the server started:', health.metrics);
  console.log(failed ? `\nSome endpoints missed the ${BUDGET_MS} ms budget.` : `\nAll endpoints are under ${BUDGET_MS} ms.`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
