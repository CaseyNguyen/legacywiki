import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BracketGame, Franchise, LeagueModel, SeasonResult, TradeModel } from '@/lib/model/types';
import { RESULT_LABEL, ordinal, pts, recordText, signed } from '@/lib/format';
import { routes } from '@/lib/routes';
import { teamById } from '@/lib/views';
import { Avatar, PosPill, TeamLink } from './bits';

export function LegacyBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
  return (
    <span className="lbar">
      <b className="tnum" style={{ textAlign: 'right' }}>
        {pts(score, 0)}
      </b>
      <span className="lbar__track" aria-hidden="true">
        <span className="lbar__fill" style={{ width: `${pct}%`, display: 'block' }} />
      </span>
    </span>
  );
}

export function resultClass(result: SeasonResult) {
  return `res-${result}`;
}

export function ResultLegend({ live = true }: { live?: boolean }) {
  const items: Array<[string, string]> = [
    ['res-champion', 'Champion'],
    ['res-runner-up', 'Runner-up'],
    ['res-third', 'Third place'],
    ['res-playoffs', 'Made playoffs'],
  ];
  if (live) items.push(['res-in-progress', 'In progress']);
  return (
    <div className="legend">
      {items.map(([cls, label]) => (
        <span key={cls}>
          <i className={cls} /> {label}
        </span>
      ))}
      <span>
        <i style={{ background: 'var(--res-missed)' }} /> Missed playoffs
      </span>
    </div>
  );
}

/** Team × season grid: playoff appearances and titles at a glance. */
export function SeasonGrid({ model }: { model: LeagueModel }) {
  const seasons = model.seasons.filter((s) => s.state !== 'upcoming');
  return (
    <>
      <div className="tbl">
        <table className="wikitable sgrid">
          <thead>
            <tr>
              <th scope="col">Team</th>
              {seasons.map((s) => (
                <th key={s.season} scope="col">
                  <Link href={routes.season(model.leagueId, s.season)} prefetch={false}>
                    {s.season}
                  </Link>
                </th>
              ))}
              <th scope="col" title="Playoff appearances">
                Playoffs
              </th>
              <th scope="col" title="Championships">
                Titles
              </th>
            </tr>
          </thead>
          <tbody>
            {model.franchises.map((f) => (
              <tr key={f.id}>
                <th scope="row" style={{ textAlign: 'left', fontWeight: 400, background: 'var(--panel)' }}>
                  <TeamLink leagueId={model.leagueId} team={f} />
                </th>
                {seasons.map((s) => {
                  const ts = f.seasons.find((x) => x.season === s.season);
                  if (!ts) return <td key={s.season} className="cell res-none" aria-label="Did not play" />;
                  const label =
                    ts.result === 'in-progress' ? recordText(ts.w, ts.l, ts.t) : ts.finish != null ? String(ts.finish) : String(ts.rank);
                  const tip = `${s.season} · ${ts.teamName}\n${recordText(ts.w, ts.l, ts.t)}, ${ordinal(ts.rank)} in the regular season\n${RESULT_LABEL[ts.result]}${
                    ts.finish ? ` · ${ordinal(ts.finish)} overall` : ''
                  }`;
                  return (
                    <td key={s.season} className={`cell ${resultClass(ts.result)}`} data-tip={tip} tabIndex={0} aria-label={tip.replace(/\n/g, ', ')}>
                      {label}
                    </td>
                  );
                })}
                <td className="num">{f.playoffApps.length}</td>
                <td className="num">{f.titles.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResultLegend live={seasons.some((s) => s.state === 'in-progress')} />
      <p className="small muted">Numbers are final placings; an in-progress season shows the current record.</p>
    </>
  );
}

export function Bracket({ model, games, title, consolation }: { model: LeagueModel; games: BracketGame[]; title: string; consolation?: boolean }) {
  if (!games.length) return null;
  const rounds = [...new Set(games.map((g) => g.round))].sort((a, b) => a - b);
  const last = rounds[rounds.length - 1];
  const roundName = (r: number) => {
    if (consolation) return `Consolation round ${r}`;
    const fromEnd = last - r;
    return fromEnd === 0 ? 'Final round' : fromEnd === 1 ? 'Semifinals' : fromEnd === 2 ? 'Quarterfinals' : `Round ${r}`;
  };
  return (
    <div className="bracket" role="group" aria-label={title}>
      {rounds.map((r) => (
        <div className="bracket__round" key={r}>
          <div className="bracket__label">{roundName(r)}</div>
          <div className="bracket__matches">
            {games
              .filter((g) => g.round === r)
              .map((g) => (
                <div className="match" key={g.match}>
                  <div className="match__title">{g.label}</div>
                  {(['a', 'b'] as const).map((side) => {
                    const id = side === 'a' ? g.a : g.b;
                    const team = id ? teamById(model, id) : null;
                    const seed = side === 'a' ? g.aSeed : g.bSeed;
                    const score = side === 'a' ? g.aPts : g.bPts;
                    return (
                      <div className={`match__row${g.winner && g.winner === id ? ' is-winner' : ''}`} key={side}>
                        <span className="match__seed">{seed ?? ''}</span>
                        <span style={{ minWidth: 0 }}>{team ? <TeamLink leagueId={model.leagueId} team={team} size={16} /> : <span className="muted">TBD</span>}</span>
                        <span className="tnum">{score != null ? pts(score) : ''}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TradeCard({ model, trade, rank }: { model: LeagueModel; trade: TradeModel; rank?: number }) {
  const winner = trade.winnerId ? teamById(model, trade.winnerId) : null;
  return (
    <article className="trade" aria-label={`Trade, ${trade.season} week ${trade.week}`}>
      <header className="trade__head">
        {rank ? <span className="trade__rank tnum">#{rank}</span> : null}
        <Link href={routes.season(model.leagueId, trade.season)} prefetch={false}>
          {trade.season}
        </Link>
        <span className="muted">Week {trade.week}</span>
        <span style={{ flex: 1 }} />
        {winner ? (
          <span>
            Won by <b>{winner.name}</b> <span className="tnum">({signed(trade.margin)} pts)</span>
          </span>
        ) : (
          <span className="muted">Even so far</span>
        )}
      </header>
      <div className="trade__sides">
        {trade.sides.map((side) => {
          const team = teamById(model, side.franchiseId);
          return (
            <div key={side.franchiseId} className={`trade__side${trade.winnerId === side.franchiseId ? ' trade__won' : ''}`}>
              <h4>
                <TeamLink leagueId={model.leagueId} team={team} size={18} /> <span className="muted" style={{ fontWeight: 400 }}>received</span>
              </h4>
              <ul>
                {side.received.map((p) => (
                  <li key={p.playerId}>
                    <PosPill pos={p.pos} />
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{p.name}</span>
                    <span className="tnum muted" title={`${p.starts} starts over ${p.weeks} weeks on the roster`}>
                      {pts(p.points, 1)} <span className="small">({p.starts} st)</span>
                    </span>
                  </li>
                ))}
                {side.picks.map((pk, i) => {
                  const from = pk.originalFranchiseId ? teamById(model, pk.originalFranchiseId) : null;
                  return (
                    <li key={`pick-${i}`}>
                      <span className="pos" style={{ background: 'var(--panel-2)', color: 'var(--ink)' }}>
                        PICK
                      </span>
                      <span>
                        {pk.season} round {pk.round}
                        {from ? <span className="muted"> (from {from.name})</span> : null}
                      </span>
                      <span className="muted small">not valued</span>
                    </li>
                  );
                })}
                {side.faab ? (
                  <li>
                    <span className="pos" style={{ background: 'var(--panel-2)', color: 'var(--ink)' }}>
                      FAAB
                    </span>
                    <span>${side.faab} waiver budget</span>
                    <span className="muted small">not valued</span>
                  </li>
                ) : null}
                {!side.received.length && !side.picks.length && !side.faab ? <li className="muted">Nothing listed</li> : null}
              </ul>
              <div className="trade__total">
                <span className="muted">Points started after the trade</span>
                <b className="tnum">{pts(side.value, 1)}</b>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function teamName(model: LeagueModel, id: string | null | undefined) {
  return (id && teamById(model, id)?.name) || 'Unknown team';
}

export type { Franchise };

export interface StandingsItem {
  key: string;
  rank: number;
  team: Franchise;
  name?: string;
  sub: ReactNode;
  stat: ReactNode;
  statLabel: string;
  result?: SeasonResult;
  barPct?: number;
}

/** Phone layout for standings: one Sleeper-style row per team. */
export function StandingsList({ leagueId, items, label }: { leagueId: string; items: StandingsItem[]; label: string }) {
  return (
    <ol className="slist" aria-label={label}>
      {items.map((it) => (
        <li key={it.key} className={`slist__row${it.result ? ` edge-${it.result}` : ''}`}>
          <span className="slist__rank">{it.rank}</span>
          <Avatar team={it.team} size={34} />
          <span className="slist__main">
            <Link href={routes.team(leagueId, it.team.id)} prefetch={false}>
              {it.name ?? it.team.name}
            </Link>
            <span className="slist__sub">{it.sub}</span>
          </span>
          <span className="slist__stat">
            <b>{it.stat}</b>
            <small>{it.statLabel}</small>
            {it.barPct != null ? (
              <span className="slist__bar" aria-hidden="true">
                <i style={{ width: `${Math.max(0, Math.min(100, it.barPct))}%` }} />
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
