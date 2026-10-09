import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PosPill, TeamLink } from '@/components/bits';
import { Sortable } from '@/components/client/ArticleEnhancers';
import { Bracket, ResultLegend, StandingsList, TradeCard, resultClass } from '@/components/league';
import {
  ArticleFrame,
  Hatnote,
  InfoHeader,
  InfoRow,
  Infobox,
  Navbox,
  PageFooter,
  PageHeading,
  PageTabs,
  Section,
  TocMobile,
  type TocItem,
} from '@/components/wiki';
import { getLeagueModel } from '@/lib/league';
import { RESULT_LABEL, ordinal, percent, pts, recordText, winPct } from '@/lib/format';
import { routes } from '@/lib/routes';
import { seasonView, teamById } from '@/lib/views';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ leagueId: string; season: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { season } = await params;
  return { title: `${season} season` };
}

export default async function SeasonPage({ params }: Props) {
  const t0 = performance.now();
  const { leagueId, season } = await params;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  const view = seasonView(model, season);
  if (!view) notFound();
  const { season: s, weeks, trades } = view;
  const team = (id: string | null | undefined) => (id ? teamById(model, id) : null);
  const index = model.seasons.findIndex((x) => x.season === season);
  const prev = model.seasons[index - 1];
  const next = model.seasons[index + 1];
  const final = s.bracket.find((g) => g.placement === 1);
  const finalScore =
    final && final.aPts != null && final.bPts != null
      ? final.winner === final.a
        ? `${pts(final.aPts)}–${pts(final.bPts)}`
        : `${pts(final.bPts)}–${pts(final.aPts)}`
      : null;
  const leader = s.standings[0];
  const pointsLeader = [...s.standings].sort((a, b) => b.pf - a.pf)[0];
  const lastPlayoffWeek = s.playoffWeekStart + Math.max(0, ...s.bracket.map((g) => g.round)) - 1;
  const sbRows = s.standings
    .map((row) => {
      const ts = team(row.franchiseId)?.seasons.find((x) => x.season === season);
      return { row, sb: ts?.startBench ?? { decisions: 0, correct: 0 } };
    })
    .filter((x) => x.sb.decisions > 0)
    .sort((a, b) => b.sb.correct / b.sb.decisions - a.sb.correct / a.sb.decisions);

  const toc: TocItem[] = [
    { id: 'standings', label: 'Standings' },
    ...(s.bracket.length ? [{ id: 'playoffs', label: 'Playoffs' }] : []),
    ...(weeks.length ? [{ id: 'results', label: 'Results by week' }] : []),
    ...(sbRows.length ? [{ id: 'start-sit', label: 'Start/sit accuracy' }] : []),
    ...(trades.length ? [{ id: 'trades', label: 'Trades' }] : []),
  ];

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="season" />
      <PageHeading title={`${s.season} ${model.name} season`} />
      <Hatnote>
        {prev ? (
          <Link href={routes.season(leagueId, prev.season)} prefetch={false}>
            ← {prev.season} season
          </Link>
        ) : (
          <span>First season</span>
        )}
        {' · '}
        <Link href={routes.seasons(leagueId)} prefetch={false}>
          List of seasons
        </Link>
        {' · '}
        {next ? (
          <Link href={routes.season(leagueId, next.season)} prefetch={false}>
            {next.season} season →
          </Link>
        ) : (
          <span>Latest season</span>
        )}
      </Hatnote>

      <Infobox title={`${s.season} season`}>
        <InfoRow label="League">
          <Link href={routes.league(leagueId)} prefetch={false}>
            {model.name}
          </Link>
        </InfoRow>
        <InfoRow label="Teams">{s.teams}</InfoRow>
        <InfoRow label="Regular season">Weeks 1–{s.regularWeeks}</InfoRow>
        {s.bracket.length ? (
          <InfoRow label="Playoffs">
            Weeks {s.playoffWeekStart}–{lastPlayoffWeek} ({s.playoffTeams} teams)
          </InfoRow>
        ) : null}
        <InfoRow label="Status">
          {s.state === 'complete' ? 'Complete' : s.state === 'in-progress' ? <span className="chip chip--live">Week {s.weeksPlayed + 1}</span> : 'Upcoming'}
        </InfoRow>
        <InfoHeader>Results</InfoHeader>
        <InfoRow label="Champion">{s.champion ? <TeamLink leagueId={leagueId} team={team(s.champion)} strong /> : '—'}</InfoRow>
        <InfoRow label="Runner-up">{s.runnerUp ? <TeamLink leagueId={leagueId} team={team(s.runnerUp)} /> : '—'}</InfoRow>
        {finalScore ? <InfoRow label="Final score">{finalScore}</InfoRow> : null}
        <InfoRow label="Best record">
          {leader && s.state !== 'upcoming' ? (
            <>
              <TeamLink leagueId={leagueId} team={team(leader.franchiseId)} /> ({recordText(leader.w, leader.l, leader.t)})
            </>
          ) : (
            '—'
          )}
        </InfoRow>
        <InfoRow label="Most points">
          {pointsLeader && pointsLeader.pf > 0 ? (
            <>
              <TeamLink leagueId={leagueId} team={team(pointsLeader.franchiseId)} /> ({pts(pointsLeader.pf, 1)})
            </>
          ) : (
            '—'
          )}
        </InfoRow>
        <InfoHeader>Season leaders</InfoHeader>
        <InfoRow label="MVP">
          {s.mvp ? (
            <>
              <PosPill pos={s.mvp.pos} /> {s.mvp.name} ({pts(s.mvp.points, 1)}), {team(s.mvp.franchiseId)?.name}
            </>
          ) : (
            '—'
          )}
        </InfoRow>
        <InfoRow label="High score">
          {s.highScore ? (
            <>
              {pts(s.highScore.points)}, {team(s.highScore.franchiseId)?.name} (wk {s.highScore.week})
            </>
          ) : (
            '—'
          )}
        </InfoRow>
        <InfoRow label="Trades">{s.trades}</InfoRow>
      </Infobox>

      <p className="lede">
        The <b>{s.season} {model.name} season</b> {s.state === 'complete' ? 'was' : 'is'} the {ordinal(index + 1)} season of
        the league.{' '}
        {s.state === 'complete' && s.champion ? (
          <>
            The <TeamLink leagueId={leagueId} team={team(s.champion)} size={0} /> won the championship
            {s.runnerUp ? (
              <>
                , beating the <TeamLink leagueId={leagueId} team={team(s.runnerUp)} size={0} />
                {finalScore ? ` ${finalScore}` : ''} in the final
              </>
            ) : null}
            .{' '}
            {leader ? (
              <>
                The <TeamLink leagueId={leagueId} team={team(leader.franchiseId)} size={0} /> had the best regular-season
                record at {recordText(leader.w, leader.l, leader.t)}.
              </>
            ) : null}
          </>
        ) : s.state === 'in-progress' && leader ? (
          <>
            {s.weeksPlayed} {s.weeksPlayed === 1 ? 'week has' : 'weeks have'} been played, and the{' '}
            <TeamLink leagueId={leagueId} team={team(leader.franchiseId)} size={0} /> lead the standings at{' '}
            {recordText(leader.w, leader.l, leader.t)}.
          </>
        ) : (
          <>The season has not started yet.</>
        )}
      </p>
      <TocMobile toc={toc} />

      <Section id="standings" title="Standings" meta={s.state === 'in-progress' ? `Through week ${s.weeksPlayed}` : 'Final'} lead>
        <StandingsList
          leagueId={leagueId}
          label={`${s.season} standings`}
          items={s.standings.map((r) => ({
            key: r.franchiseId,
            rank: r.rank,
            team: team(r.franchiseId)!,
            name: r.teamName,
            sub: `${pts(r.pf, 1)} PF · ${r.finish ? `${ordinal(r.finish)} overall` : RESULT_LABEL[r.result]}`,
            stat: recordText(r.w, r.l, r.t),
            statLabel: 'Record',
            result: r.result,
          }))}
        />
        <Sortable className="desktop-table">
          <table className="wikitable">
            <thead>
              <tr>
                <th data-sort="num" scope="col">#</th>
                <th data-sort="text" scope="col">Team</th>
                <th data-sort="num" scope="col">Record</th>
                <th data-sort="num" scope="col">Pct.</th>
                <th data-sort="num" scope="col">PF</th>
                <th data-sort="num" scope="col">PA</th>
                <th data-sort="num" scope="col">PF/G</th>
                <th data-sort="num" scope="col">Finish</th>
              </tr>
            </thead>
            <tbody>
              {s.standings.map((r) => (
                <tr key={r.franchiseId}>
                  <td className="num">{r.rank}</td>
                  <td data-sort-value={r.teamName}>
                    <span className="nowrap">
                      <TeamLink leagueId={leagueId} team={team(r.franchiseId)}>
                        {r.teamName}
                      </TeamLink>
                      {r.madePlayoffs ? <sup className="muted" title="Made the playoffs"> x</sup> : null}
                    </span>
                  </td>
                  <td className="num" data-sort-value={(r.w + r.t / 2) / Math.max(1, r.w + r.l + r.t)}>
                    {recordText(r.w, r.l, r.t)}
                  </td>
                  <td className="num">{winPct(r.w, r.l, r.t)}</td>
                  <td className="num">{pts(r.pf, 1)}</td>
                  <td className="num">{pts(r.pa, 1)}</td>
                  <td className="num">{pts(r.avgPF)}</td>
                  <td className={resultClass(r.result)} data-sort-value={r.finish ?? r.rank + 100}>
                    {r.finish ? ordinal(r.finish) : RESULT_LABEL[r.result]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sortable>
        <ResultLegend live={s.state === 'in-progress'} />
        <p className="small muted">x – made the playoffs. Ties in the standings are broken by points for.</p>
      </Section>

      {s.bracket.length ? (
        <Section id="playoffs" title="Playoffs">
          <p className="small muted">Numbers beside each team are regular-season standings.</p>
          <Bracket model={model} games={s.bracket} title={`${s.season} playoff bracket`} />
          {s.consolation.length ? (
            <>
              <h3>Consolation bracket</h3>
              <Bracket model={model} games={s.consolation} title={`${s.season} consolation bracket`} consolation />
            </>
          ) : null}
        </Section>
      ) : null}

      {weeks.length ? (
        <Section id="results" title="Results by week">
          {weeks.map((w, i) => (
            <details key={w.week} open={i === weeks.length - 1} style={{ margin: '0 0 6px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Week {w.week}</summary>
              <div className="tbl" style={{ margin: '4px 0 8px' }}>
                <table className="wikitable">
                  <tbody>
                    {w.games.map((g) => {
                      const aWon = g.winner === g.a;
                      const bWon = g.winner === g.b;
                      return (
                        <tr key={g.id}>
                          <td style={{ fontWeight: aWon ? 700 : 400 }}>
                            <TeamLink leagueId={leagueId} team={team(g.a)} />
                          </td>
                          <td className="num" style={{ fontWeight: aWon ? 700 : 400 }}>
                            {pts(g.aPts)}
                          </td>
                          <td className="num" style={{ fontWeight: bWon ? 700 : 400 }}>
                            {pts(g.bPts)}
                          </td>
                          <td style={{ fontWeight: bWon ? 700 : 400 }}>
                            <TeamLink leagueId={leagueId} team={team(g.b)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </Section>
      ) : null}

      {sbRows.length ? (
        <Section id="start-sit" title="Start/sit accuracy">
          <div className="tbl">
            <table className="wikitable">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col">Decisions</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                {sbRows.map(({ row, sb }) => (
                  <tr key={row.franchiseId}>
                    <td>
                      <TeamLink leagueId={leagueId} team={team(row.franchiseId)}>
                        {row.teamName}
                      </TeamLink>
                    </td>
                    <td className="num">{sb.decisions}</td>
                    <td className="num">{sb.correct}</td>
                    <td className="num">{percent(sb.correct / sb.decisions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {trades.length ? (
        <Section id="trades" title="Trades" meta={`${trades.length} this season`}>
          {trades.map((t) => (
            <TradeCard key={t.id} model={model} trade={t} />
          ))}
        </Section>
      ) : null}

      <Navbox model={model} />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
