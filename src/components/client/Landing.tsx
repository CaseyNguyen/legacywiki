'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { LEAGUE_INPUT_MESSAGES, parseLeagueInput } from '@/lib/league-input';
import { readSaved, type SavedLeague } from './Shell';

const EXAMPLE_ID = '1048123456789012345';

function GearIcon() {
  return (
    <svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="10.6" y="2" width="2.8" height="4.2" rx="0.8" fill="currentColor" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" strokeWidth="2.8" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="5" width="15" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 19h19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Landing({ forceNew }: { forceNew: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState(false);
  const [canPaste, setCanPaste] = useState(false);
  const [recent, setRecent] = useState<SavedLeague[]>([]);
  const [reopening, setReopening] = useState<SavedLeague | null>(null);

  useEffect(() => {
    const { last, recent } = readSaved();
    setRecent(recent);
    if (!forceNew && last) {
      setReopening(last);
      router.replace(routes.league(last.id));
    }
    setCanPaste(typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function');
  }, [forceNew, router]);

  const parsed = parseLeagueInput(input);
  // Invite links and other links are flagged right away; a partly typed ID only after leaving the box.
  const showProblem = !parsed.ok && input.trim() !== '' && (touched || parsed.problem === 'invite' || parsed.problem === 'other-link');

  function update(value: string) {
    setInput(value);
    setServerError(null);
    setPasteHint(false);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        update(text.trim());
        setTouched(true);
      }
    } catch {
      setPasteHint(true);
    }
    inputRef.current?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!parsed.ok) {
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const res = await fetch('/api/league', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json()) as { status: string; leagueId?: string; error?: string };
      if (!res.ok && res.status !== 202) throw new Error(data.error ?? 'Something went wrong. Try again in a moment.');
      router.push(routes.league(data.leagueId!));
    } catch (err) {
      setServerError((err as Error).message);
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

  const status = serverError
    ? { tone: 'bad', text: serverError }
    : showProblem && !parsed.ok
      ? { tone: 'bad', text: LEAGUE_INPUT_MESSAGES[parsed.problem] }
      : parsed.ok
        ? { tone: 'ok', text: parsed.id === 'demo' ? '✓ Demo league' : `✓ League ID ${parsed.id}` }
        : pasteHint
          ? { tone: 'muted', text: 'Your browser blocked the Paste button. Press and hold the box, then choose Paste.' }
          : null;

  return (
    <main className="landing">
      <h1 className="landing__title">Welcome to LegacyWiki, the encyclopedia of your fantasy league.</h1>
      <p className="landing__lede">
        Enter your Sleeper league ID and get a wiki of the league’s whole history: legacy standings, every team’s story,
        rivalries, head-to-head records, Hall of Fame seasons and the best trades ever made.
      </p>

      <section className="portal" aria-labelledby="start-h">
        <h2 id="start-h" className="sr-only">
          Open a league
        </h2>
        <form onSubmit={submit} noValidate>
          <label htmlFor="league-input" className="portal__label">
            Your Sleeper league ID
          </label>
          <p className="portal__hint" id="league-hint">
            Just the number is enough. You don’t need to make a link, though a sleeper.com league link works too.
          </p>
          <div className="portal__row">
            <div className="field-wrap">
              <input
                id="league-input"
                ref={inputRef}
                className={`field${canPaste ? ' field--paste' : ''}`}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={`e.g. ${EXAMPLE_ID}`}
                value={input}
                onChange={(e) => update(e.target.value)}
                onPaste={() => setTouched(true)}
                onBlur={() => setTouched(true)}
                aria-describedby="league-hint league-status"
                aria-invalid={showProblem || Boolean(serverError)}
              />
              {canPaste ? (
                <button type="button" className="field-paste" onClick={pasteFromClipboard}>
                  Paste
                </button>
              ) : null}
            </div>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Opening…' : 'Create the wiki'}
            </button>
          </div>
          <p id="league-status" className={`portal__status${status ? ` is-${status.tone}` : ''}`} role="status" aria-live="polite">
            {status?.text ?? ''}
          </p>
        </form>

        <section className="findid" aria-labelledby="findid-h">
          <h3 id="findid-h">Where to find your league ID</h3>
          <div className="findid__grid">
            <div className="findid__col">
              <h4>
                <PhoneIcon /> In the Sleeper app
              </h4>
              <ol className="findid__steps">
                <li>
                  <span>Open your league.</span>
                </li>
                <li>
                  <span>
                    Tap the <b>gear icon</b> <GearIcon /> to open the league settings.
                  </span>
                </li>
                <li>
                  <span>
                    Tap <b>General</b>.
                  </span>
                </li>
                <li>
                  <span>
                    Scroll to the bottom and tap <b>Copy League ID</b>.
                  </span>
                </li>
                <li>
                  <span>{canPaste ? <>Come back here and tap <b>Paste</b>.</> : <>Come back here and paste it into the box.</>}</span>
                </li>
              </ol>
            </div>
            <div className="findid__col">
              <h4>
                <LaptopIcon /> On sleeper.com
              </h4>
              <p>Open your league. The ID is the long number in the address bar, after <code>/leagues/</code>:</p>
              <div className="urlbar" aria-label={`Example address: sleeper.com/leagues/${EXAMPLE_ID}/team`}>
                sleeper.com/leagues/<wbr />
                <mark>{EXAMPLE_ID}</mark>/team
              </div>
              <p>Copy that number, or paste the whole address.</p>
            </div>
          </div>
          <p className="findid__note">
            Use this season’s league ID: LegacyWiki follows it back through every past season. Invite links
            (sleeper.com/i/…) don’t contain the ID. No sign-in needed, since Sleeper’s league data is public.
          </p>
        </section>

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
            <li>An article telling every team’s story</li>
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
