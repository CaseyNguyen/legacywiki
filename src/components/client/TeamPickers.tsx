'use client';

import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';

/** Two team selects that drive the ?a=&b= query for head-to-head and legacy comparison. */
export function TeamPickers({
  leagueId,
  mode,
  teams,
  a,
  b,
}: {
  leagueId: string;
  mode: 'h2h' | 'compare';
  teams: Array<{ id: string; name: string; active: boolean }>;
  a: string;
  b: string;
}) {
  const router = useRouter();
  const go = (na: string, nb: string) => router.push(mode === 'h2h' ? routes.h2h(leagueId, na, nb) : routes.compare(leagueId, na, nb));
  const options = (exclude: string) => (
    <>
      <optgroup label="Current teams">
        {teams
          .filter((t) => t.active)
          .map((t) => (
            <option key={t.id} value={t.id} disabled={t.id === exclude}>
              {t.name}
            </option>
          ))}
      </optgroup>
      {teams.some((t) => !t.active) ? (
        <optgroup label="Former teams">
          {teams
            .filter((t) => !t.active)
            .map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === exclude}>
                {t.name}
              </option>
            ))}
        </optgroup>
      ) : null}
    </>
  );
  return (
    <div className="pickers">
      <label htmlFor={`${mode}-a`}>
        First team
        <select id={`${mode}-a`} value={a} onChange={(e) => go(e.target.value, b)}>
          {options(b)}
        </select>
      </label>
      <button type="button" className="btn" onClick={() => go(b, a)} aria-label="Swap teams" title="Swap teams">
        ⇄ Swap
      </button>
      <label htmlFor={`${mode}-b`}>
        Second team
        <select id={`${mode}-b`} value={b} onChange={(e) => go(a, e.target.value)}>
          {options(a)}
        </select>
      </label>
    </div>
  );
}
