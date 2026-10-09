'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { forgetLeague } from './Shell';

interface Status {
  status: 'starting' | 'idle' | 'building' | 'ready' | 'error';
  progress?: { phase: string; done: number; total: number; message: string } | null;
  error?: string;
}

const PHASES: Array<[string, string]> = [
  ['history', 'Tracing the league back to its first season'],
  ['fetching', 'Downloading every season, matchup and trade'],
  ['computing', 'Computing records, rivalries and legacies'],
  ['colors', 'Matching team colors to logos'],
];

export function BuildScreen({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [state, setState] = useState<Status>({ status: 'starting' });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const res = await fetch(`/api/league/${encodeURIComponent(leagueId)}/status?start=1`, { cache: 'no-store' });
        const data = (await res.json()) as Status;
        if (stopped) return;
        setState(data);
        if (data.status === 'ready') {
          router.refresh();
          return;
        }
        if (data.status === 'error') {
          forgetLeague(leagueId);
          return;
        }
      } catch {
        /* transient; keep polling */
      }
      if (!stopped) timer = setTimeout(tick, 700);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [leagueId, router]);

  if (state.status === 'error') {
    return (
      <div className="building" role="alert">
        <h1>We couldn’t open that league</h1>
        <p className="muted">{state.error ?? 'Sleeper did not return this league.'}</p>
        <p>
          <Link className="btn btn--primary" href={routes.newLeague()}>
            Try another league
          </Link>
        </p>
      </div>
    );
  }

  const phaseIndex = Math.max(0, PHASES.findIndex(([key]) => key === state.progress?.phase));
  const p = state.progress;
  const fraction =
    state.status === 'ready'
      ? 1
      : p
        ? (phaseIndex + Math.min(1, p.total ? p.done / p.total : 0)) / PHASES.length
        : 0.02;

  return (
    <div className="building" aria-live="polite">
      <h1>Writing your league’s encyclopedia</h1>
      <p className="muted">The first visit downloads the full history from Sleeper. After that, every page loads from cache.</p>
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
        <div className="meter__fill" style={{ width: `${Math.max(3, fraction * 100)}%` }} />
      </div>
      <p className="small muted tnum">
        {p ? `${p.message}${p.phase === 'fetching' ? ` (${p.done} of ${p.total})` : ''}` : 'Starting…'}
      </p>
      <ol className="steps">
        {PHASES.map(([key, label], i) => (
          <li key={key} className={i < phaseIndex ? 'is-done' : i === phaseIndex ? 'is-now' : ''}>
            {i < phaseIndex ? '✓ ' : i === phaseIndex ? '→ ' : '· '}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
