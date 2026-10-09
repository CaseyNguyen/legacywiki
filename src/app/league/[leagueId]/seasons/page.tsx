import Link from 'next/link';
import type { Metadata } from 'next';
import { PosPill, TeamLink } from '@/components/bits';
import { ArticleFrame, Navbox, PageFooter, PageHeading, PageTabs, Section, TocMobile, type TocItem } from '@/components/wiki';
import { getLeagueModel } from '@/lib/league';
import { pts, recordText } from '@/lib/format';
import { routes } from '@/lib/routes';
import { teamById } from '@/lib/views';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'List of seasons' };

export default async function SeasonsPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  const team = (id: string | null | undefined) => (id ? teamById(model, id) : null);
  const toc: TocItem[] = [{ id: 'seasons', label: 'Seasons' }];

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="seasons" />
      <PageHeading title={`List of ${model.name} seasons`} />
      <p className="lede">
        This is a list of seasons played in the{' '}
        <Link href={routes.league(leagueId)} prefetch={false}>
          {model.name}
        </Link>
        , from its founding in {model.seasons[0]?.season} to the present, with each season’s champion and leaders.
      </p>
      <TocMobile toc={toc} />
      <Section id="seasons" title="Seasons">
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Season</th>
                <th scope="col">Teams</th>
                <th scope="col">Champion</th>
                <th scope="col">Final</th>
                <th scope="col">Runner-up</th>
                <th scope="col">Best record</th>
                <th scope="col">Most points</th>
                <th scope="col">MVP</th>
                <th scope="col">Trades</th>
              </tr>
            </thead>
            <tbody>
              {[...model.seasons].reverse().map((s) => {
                const fin = s.bracket.find((g) => g.placement === 1);
                const score =
                  fin && fin.aPts != null && fin.bPts != null
                    ? fin.winner === fin.a
                      ? `${pts(fin.aPts)}–${pts(fin.bPts)}`
                      : `${pts(fin.bPts)}–${pts(fin.aPts)}`
                    : '—';
                const lead = s.standings[0];
                const pl = [...s.standings].sort((a, b) => b.pf - a.pf)[0];
                return (
                  <tr key={s.season}>
                    <td>
                      <Link href={routes.season(leagueId, s.season)} prefetch={false}>
                        <b>{s.season}</b>
                      </Link>
                    </td>
                    <td className="num">{s.teams}</td>
                    <td className={s.champion ? 'res-champion' : undefined}>
                      {s.champion ? (
                        <TeamLink leagueId={leagueId} team={team(s.champion)} strong />
                      ) : s.state === 'in-progress' ? (
                        <span className="chip chip--live">Week {s.weeksPlayed + 1}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num">{score}</td>
                    <td>{s.runnerUp ? <TeamLink leagueId={leagueId} team={team(s.runnerUp)} /> : '—'}</td>
                    <td>
                      {lead && s.state !== 'upcoming' ? (
                        <>
                          <TeamLink leagueId={leagueId} team={team(lead.franchiseId)} />{' '}
                          <span className="muted tnum">({recordText(lead.w, lead.l, lead.t)})</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {pl && pl.pf > 0 ? (
                        <>
                          <TeamLink leagueId={leagueId} team={team(pl.franchiseId)} /> <span className="muted tnum">({pts(pl.pf, 1)})</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {s.mvp ? (
                        <>
                          <PosPill pos={s.mvp.pos} /> {s.mvp.name}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num">{s.trades}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <Navbox model={model} />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
