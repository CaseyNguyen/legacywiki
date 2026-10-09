import Link from 'next/link';
import type { Metadata } from 'next';
import { Avatar, TeamLink } from '@/components/bits';
import { TeamPickers } from '@/components/client/TeamPickers';
import { FinishChart } from '@/components/charts';
import { resultClass } from '@/components/league';
import { UniformSet } from '@/components/Uniform';
import { ArticleFrame, Navbox, PageFooter, PageHeading, PageTabs, Section, TocMobile, type TocItem } from '@/components/wiki';
import { getLeagueModel } from '@/lib/league';
import { RESULT_LABEL, ordinal, percent, possessive, pts, recordText, winPct } from '@/lib/format';
import { routes } from '@/lib/routes';
import { compareView, resolvePair, type Better } from '@/lib/views';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Legacy comparison' };

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function fmt(kind: string, v: number | null) {
  if (v == null) return '—';
  switch (kind) {
    case 'score':
      return pts(v, 0);
    case 'pts':
      return pts(v);
    case 'pct3':
      return v >= 1 ? '1.000' : v.toFixed(3).replace(/^0/, '');
    case 'percent':
      return percent(v);
    case 'ordinal':
    case 'rank':
      return ordinal(v);
    default:
      return String(v);
  }
}

function winner(better: Better, a: number | null, b: number | null): 'a' | 'b' | null {
  if (better === 'none' || a == null || b == null || a === b) return null;
  return (better === 'high' ? a > b : a < b) ? 'a' : 'b';
}

export default async function ComparePage({ params, searchParams }: Props) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const sp = await searchParams;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  if (model.franchises.length < 2) return <p className="landing">This league needs at least two teams.</p>;
  const pair =
    !sp.a && !sp.b ? { a: model.franchises[0].id, b: model.franchises[1].id } : resolvePair(model, sp.a, sp.b);
  const view = compareView(model, pair.a, pair.b)!;
  const { a, b, rows, seasons, h2h } = view;
  const diff = Math.abs(a.legacy.score - b.legacy.score);
  const ahead = a.legacy.score >= b.legacy.score ? a : b;
  const behind = ahead === a ? b : a;
  const teamsList = model.franchises.map((f) => ({ id: f.id, name: f.name, active: f.active }));
  const toc: TocItem[] = [
    { id: 'tale-of-the-tape', label: 'Tale of the tape' },
    { id: 'breakdown', label: 'Legacy Score breakdown' },
    { id: 'by-season', label: 'Season by season' },
    { id: 'uniforms', label: 'Uniforms' },
    { id: 'head-to-head', label: 'Head-to-head' },
  ];

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="compare" />
      <PageHeading title={`${a.name} vs. ${b.name}`} tagline="Legacy comparison · From LegacyWiki, the league encyclopedia" />
      <TeamPickers leagueId={leagueId} mode="compare" teams={teamsList} a={a.id} b={b.id} />

      <div className="scoreboard" aria-label="Legacy Scores">
        <div className="sb-side">
          <span className="sb-ring" style={{ background: a.palette.primary }}>
            <Avatar team={a} size={52} />
          </span>
          <div>
            <div className="sb-name">
              <Link href={routes.team(leagueId, a.id)} prefetch={false}>
                {a.name}
              </Link>
            </div>
            <div className="sb-sub">{ordinal(a.legacy.rank)} in Legacy Score</div>
          </div>
        </div>
        <div className="sb-score tnum">
          <span className={ahead === a && diff > 0 ? 'lead' : undefined}>{pts(a.legacy.score, 0)}</span>
          <small>Legacy</small>
          <span className={ahead === b && diff > 0 ? 'lead' : undefined}>{pts(b.legacy.score, 0)}</span>
        </div>
        <div className="sb-side sb-side--b">
          <span className="sb-ring" style={{ background: b.palette.primary }}>
            <Avatar team={b} size={52} />
          </span>
          <div>
            <div className="sb-name">
              <Link href={routes.team(leagueId, b.id)} prefetch={false}>
                {b.name}
              </Link>
            </div>
            <div className="sb-sub">{ordinal(b.legacy.rank)} in Legacy Score</div>
          </div>
        </div>
      </div>

      <p className="lede">
        {diff > 0 ? (
          <>
            By Legacy Score, the <TeamLink leagueId={leagueId} team={ahead} size={0} /> ({pts(ahead.legacy.score, 0)}) rank ahead of the{' '}
            <TeamLink leagueId={leagueId} team={behind} size={0} /> ({pts(behind.legacy.score, 0)}) by {pts(diff, 0)} points.{' '}
          </>
        ) : (
          <>The two franchises are level on Legacy Score at {pts(a.legacy.score, 0)}. </>
        )}
        {a.titles.length + b.titles.length === 0
          ? 'Neither has won a championship'
          : `The ${a.name} have won ${a.titles.length} ${a.titles.length === 1 ? 'title' : 'titles'} to the ${possessive(b.name)} ${b.titles.length}`}
        {h2h.games.length ? (
          <>
            , and in {h2h.games.length} {h2h.games.length === 1 ? 'meeting' : 'meetings'}{' '}
            {h2h.aWins === h2h.bWins
              ? `the series is tied ${h2h.aWins}–${h2h.bWins}`
              : `the ${h2h.aWins > h2h.bWins ? a.name : b.name} lead ${Math.max(h2h.aWins, h2h.bWins)}–${Math.min(h2h.aWins, h2h.bWins)}`}
            .
          </>
        ) : (
          <>, and the two have never met.</>
        )}
      </p>
      <TocMobile toc={toc} />

      <Section id="tale-of-the-tape" title="Tale of the tape">
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">
                  <TeamLink leagueId={leagueId} team={a} />
                </th>
                <th scope="col">Category</th>
                <th scope="col">
                  <TeamLink leagueId={leagueId} team={b} />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const w = winner(r.better, r.a, r.b);
                return (
                  <tr key={r.label}>
                    <td className="num" style={{ fontWeight: w === 'a' ? 700 : 400 }}>
                      {w === 'a' ? <span aria-label="better">▲ </span> : null}
                      {fmt(r.kind, r.a)}
                    </td>
                    <th scope="row" className="c" style={{ fontWeight: 400 }}>
                      {r.label}
                    </th>
                    <td className="num" style={{ fontWeight: w === 'b' ? 700 : 400, textAlign: 'left' }}>
                      {fmt(r.kind, r.b)}
                      {w === 'b' ? <span aria-label="better"> ▲</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted">▲ marks the better figure. Win percentage counts regular-season games only.</p>
      </Section>

      <Section id="breakdown" title="Legacy Score breakdown">
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col" rowSpan={2}>
                  Component
                </th>
                <th scope="col" colSpan={2}>
                  {a.abbr}
                </th>
                <th scope="col" colSpan={2}>
                  {b.abbr}
                </th>
              </tr>
              <tr>
                <th scope="col">Count</th>
                <th scope="col">Points</th>
                <th scope="col">Count</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {a.legacy.lines.map((line, i) => {
                const other = b.legacy.lines[i];
                return (
                  <tr key={line.key}>
                    <td>
                      {line.label} <span className="muted small">({line.weight > 0 ? '+' : '−'}{Math.abs(line.weight)})</span>
                    </td>
                    <td className="num">{line.count}</td>
                    <td className="num">{pts(line.points, 0)}</td>
                    <td className="num">{other.count}</td>
                    <td className="num">{pts(other.points, 0)}</td>
                  </tr>
                );
              })}
              <tr>
                <th scope="row" style={{ textAlign: 'left' }}>
                  Total
                </th>
                <td />
                <th className="num">{pts(a.legacy.score, 0)}</th>
                <td />
                <th className="num">{pts(b.legacy.score, 0)}</th>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="by-season" title="Season by season">
        <FinishChart seasons={seasons} a={a} b={b} teams={model.format.teams} />
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Season</th>
                <th scope="col">{a.name}</th>
                <th scope="col">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {[...seasons].reverse().map((s) => (
                <tr key={s.season}>
                  <td>
                    <Link href={routes.season(leagueId, s.season)} prefetch={false}>
                      {s.season}
                    </Link>
                  </td>
                  {[s.a, s.b].map((x, i) => (
                    <td key={i} className={x ? resultClass(x.result) : undefined}>
                      {x ? (
                        <>
                          <span className="tnum">{recordText(x.w, x.l, x.t)}</span> · {RESULT_LABEL[x.result]}
                          {x.finish && (x.result === 'playoffs' || x.result === 'missed') ? <span className="muted"> ({ordinal(x.finish)})</span> : null}
                        </>
                      ) : (
                        <span className="muted">Not in league</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="uniforms" title="Uniforms">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: 12 }}>
          {[a, b].map((t) => (
            <div key={t.id} style={{ minWidth: 0 }}>
              <h3 style={{ marginTop: 4 }}>
                <TeamLink leagueId={leagueId} team={t} />
              </h3>
              <UniformSet team={t} small variants={['home', 'away']} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="head-to-head" title="Head-to-head">
        {h2h.games.length ? (
          <p>
            The {a.name} are {h2h.aWins}–{h2h.bWins}
            {h2h.ties ? `–${h2h.ties}` : ''} against the {b.name} ({winPct(h2h.aWins, h2h.bWins, h2h.ties)}), scoring {pts(h2h.aAvg)} points per
            meeting to {pts(h2h.bAvg)}.{' '}
            <Link href={routes.h2h(leagueId, a.id, b.id)} prefetch={false}>
              Full head-to-head history →
            </Link>
          </p>
        ) : (
          <p className="muted">These teams have never played each other.</p>
        )}
      </Section>

      <Navbox model={model} />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
