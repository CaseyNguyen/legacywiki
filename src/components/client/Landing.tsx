'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { readSaved, type SavedLeague } from './Shell';

export function Landing({ forceNew, aiEnabled }: { forceNew: boolean; aiEnabled: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<SavedLeague[]>([]);
  const [reopening, setReopening] = useState<SavedLeague | null>(null);

  useEffect(() => {
    const { last, recent } = readSaved();
    setRecent(recent);
    if (!forceNew && last) {
      setReopening(last);
      router.replace(routes.league(last.id));
    }
  }, [forceNew, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/league', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json()) as { status: string; leagueId?: string; error?: string };
      if (!res.ok && res.status !== 202) throw new Error(data.error ?? 'Something went wrong.');
      router.push(routes.league(data.leagueId!));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (reopening) {
    return (
      <div className="building" aria-live="polite">
        <h1>Reopening {reopening.name}…</h1>
        <p className="muted">
          <Link href={routes.newLeague()}>Open a different league instead</Link>
        </p>
      </div>
    );
  }

  return (
    <main className="landing">
      <h1 className="landing__title">Welcome to LegacyWiki, the encyclopedia of your fantasy league.</h1>
      <p className="landing__lede">
        Paste your Sleeper league and get a wiki of its whole history: legacy standings, every team’s story, rivalries,
        head-to-head records, Hall of Fame seasons and the best trades ever made.
      </p>

      <section className="portal" aria-labelledby="start-h">
        <h2 id="start-h" className="sr-only">
          Open a league
        </h2>
        <form onSubmit={submit}>
          <label htmlFor="league-input" className="sr-only">
            Sleeper league link or ID
          </label>
          <input
            id="league-input"
            className="field"
            inputMode="url"
            autoComplete="off"
            placeholder="https://sleeper.com/leagues/1180…/league  or  1180…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Opening…' : 'Create the wiki'}
          </button>
        </form>
        {error ? (
          <p className="portal__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="portal__help">
          Use the link to your league on sleeper.com (it contains <code>/leagues/</code> and a long number) or just the
          number. Paste the current season’s league so the history includes every year. No sign-in needed: the Sleeper
          API is public and read-only.
        </p>
        <p className="portal__help">
          No league handy? <Link href={routes.league('demo')}>Explore the demo league</Link>, a fictional league with six
          seasons of sample data.
        </p>
      </section>

      {recent.length ? (
        <section style={{ marginTop: 22 }}>
          <h2 className="sr-only">Recently opened</h2>
          <p className="small muted" style={{ margin: '0 0 6px' }}>
            Recently opened on this device
          </p>
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.id}>
                <Link className="btn" href={routes.league(r.id)}>
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mp-grid">
        <section className="mp-box">
          <h2>What gets written</h2>
          <ul>
            <li>Legacy Score standings across every season</li>
            <li>An article for every team{aiEnabled ? ', written by Claude' : ''}</li>
            <li>Team colors and uniforms drawn from each logo</li>
            <li>Season pages with standings and playoff brackets</li>
          </ul>
        </section>
        <section className="mp-box">
          <h2>Settle arguments</h2>
          <ul>
            <li>Head-to-head history for any two teams</li>
            <li>Legacy comparisons, side by side</li>
            <li>Rivalries ranked by games played</li>
            <li>Start/sit accuracy and costliest benchings</li>
          </ul>
        </section>
        <section className="mp-box">
          <h2>Did you know…</h2>
          <p>
            …that LegacyWiki ranks trades by the points each side actually started after the deal, so the “best trade
            ever” is measured on the scoreboard, not by hindsight?
          </p>
        </section>
      </div>
    </main>
  );
}
