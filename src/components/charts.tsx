import type { CSSProperties } from 'react';
import type { Franchise, TeamSeason } from '@/lib/model/types';
import { ordinal, pts } from '@/lib/format';

/* Charts follow the house dataviz rules: thin marks, 4px rounded data ends,
   hairline grid, text in ink tokens, a legend whenever two things are plotted,
   and a hover tooltip on every mark (via the shared TipLayer). */

function niceMax(v: number, step: number) {
  return Math.max(step, Math.ceil(v / step) * step);
}

function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${y + h} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h} Z`;
}

export function PointsPerGameChart({
  team,
  leagueAvg,
}: {
  team: Franchise;
  leagueAvg: Record<string, number>;
}) {
  const seasons = team.seasons.filter((s) => s.result !== 'upcoming' && s.weeks > 0);
  if (!seasons.length) return null;
  const W = 640;
  const H = 230;
  const m = { l: 38, r: 10, t: 14, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const top = niceMax(Math.max(...seasons.map((s) => Math.max(s.avgPF, leagueAvg[s.season] ?? 0))) * 1.05, 20);
  const ticks = Array.from({ length: Math.floor(top / 20) + 1 }, (_, i) => i * 20).filter((t) => t <= top);
  const band = iw / seasons.length;
  const bw = Math.min(24, band * 0.42);
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const best = seasons.reduce((a, b) => (b.avgPF > a.avgPF ? b : a));
  const style = { '--s-light': team.palette.chartLight, '--s-dark': team.palette.chartDark } as CSSProperties;

  return (
    <figure className="figure series-scope" style={style}>
      <p className="figure__title">Points per game by season</p>
      <div className="chart-legend">
        <span>
          <i className="key-dot" style={{ background: 'var(--series)', borderRadius: 2 }} /> {team.name}
        </span>
        <span>
          <i className="key-line" style={{ background: 'var(--ink-2)' }} /> League average
        </span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Points per game by season for ${team.name}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'axis' : 'grid'} x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {seasons.map((s: TeamSeason, i) => {
          const cx = m.l + band * i + band / 2;
          const avg = leagueAvg[s.season] ?? 0;
          const live = s.result === 'in-progress';
          const tip = `${s.season}${live ? ' (in progress)' : ''}\n${pts(s.avgPF)} points per game\nLeague average ${pts(avg)}\nRecord ${s.w}–${s.l}${s.t ? `–${s.t}` : ''}`;
          return (
            <g key={s.season}>
              <path d={columnPath(cx - bw / 2, y(s.avgPF), bw, y(0) - y(s.avgPF))} fill="var(--series)" opacity={live ? 0.55 : 1} />
              {avg > 0 ? (
                <line x1={cx - band * 0.3} x2={cx + band * 0.3} y1={y(avg)} y2={y(avg)} stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" />
              ) : null}
              <text x={cx} y={H - 8} textAnchor="middle">
                {s.season}
              </text>
              {s === best ? (
                <text x={cx} y={y(s.avgPF) - 6} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 700 }}>
                  {pts(s.avgPF, 1)}
                </text>
              ) : null}
              <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" data-tip={tip} tabIndex={0} aria-label={tip.replace(/\n/g, ', ')} />
            </g>
          );
        })}
      </svg>
      <p className="figure__sub">Regular season only. Faded bars mark a season still in progress.</p>
    </figure>
  );
}

export function FinishChart({
  seasons,
  a,
  b,
  teams,
}: {
  seasons: Array<{ season: string; a: TeamSeason | null; b: TeamSeason | null }>;
  a: Franchise;
  b: Franchise;
  teams: number;
}) {
  const rows = seasons.filter((s) => s.a?.finish != null || s.b?.finish != null);
  if (rows.length < 2) return null;
  const W = 640;
  const H = 240;
  const m = { l: 40, r: 14, t: 14, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = Math.max(teams, ...rows.flatMap((r) => [r.a?.finish ?? 0, r.b?.finish ?? 0]));
  const x = (i: number) => m.l + (rows.length === 1 ? iw / 2 : (iw * i) / (rows.length - 1));
  const y = (rank: number) => m.t + ((rank - 1) / Math.max(1, n - 1)) * ih;
  const ticks = Array.from({ length: n }, (_, i) => i + 1).filter((r) => n <= 8 || r === 1 || r % 2 === 1 || r === n);

  const series = (key: 'a' | 'b', color: string, team: Franchise) => {
    const pointsList = rows.map((r, i) => ({ i, s: r[key] }));
    const segments: string[] = [];
    let current = '';
    for (const p of pointsList) {
      if (p.s?.finish != null) current += `${current ? 'L' : 'M'}${x(p.i)} ${y(p.s.finish)} `;
      else if (current) {
        segments.push(current);
        current = '';
      }
    }
    if (current) segments.push(current);
    return (
      <g>
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {pointsList.map((p) =>
          p.s?.finish != null ? (
            <circle
              key={p.i}
              cx={x(p.i)}
              cy={y(p.s.finish)}
              r="5"
              fill={color}
              stroke="var(--paper)"
              strokeWidth="2"
              data-tip={`${team.name}\n${rows[p.i].season}: ${ordinal(p.s.finish)} place (${p.s.w}–${p.s.l}${p.s.t ? `–${p.s.t}` : ''})`}
              tabIndex={0}
            />
          ) : null,
        )}
      </g>
    );
  };

  return (
    <figure className="figure">
      <p className="figure__title">Final finish by season</p>
      <div className="chart-legend">
        <span>
          <i className="key-dot" style={{ background: 'var(--viz-a)' }} /> {a.name}
        </span>
        <span>
          <i className="key-dot" style={{ background: 'var(--viz-b)' }} /> {b.name}
        </span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Final finish by season, ${a.name} and ${b.name}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end">
              {ordinal(t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => (
          <text key={r.season} x={x(i)} y={H - 6} textAnchor="middle">
            {r.season}
          </text>
        ))}
        {series('a', 'var(--viz-a)', a)}
        {series('b', 'var(--viz-b)', b)}
      </svg>
      <p className="figure__sub">Completed seasons only; 1st is the champion.</p>
    </figure>
  );
}
