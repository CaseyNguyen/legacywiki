import Link from 'next/link';
import type { Metadata } from 'next';
import { Avatar, TeamLink } from '@/components/bits';
import { TeamPickers } from '@/components/client/TeamPickers';
import { ArticleFrame, Navbox, PageFooter, PageHeading, PageTabs, Section, TocMobile, type TocItem } from '@/components/wiki';
import { getLeagueModel } from '@/lib/league';
import { possessive, pts, recordText, signed } from '@/lib/format';
import { routes } from '@/lib/routes';
import { headToHead, resolvePair, teamById, type OrientedGame } from '@/lib/views';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Head-to-head' };

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function gameLabel(g: OrientedGame) {
  return g.label ?? (g.kind === 'regular' ? 'Regular season' : 'Playoffs');
}

export default async function HeadToHeadPage({ params, searchParams }: Props) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const sp = await searchParams;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  if (model.franchises.length < 2) return <p className="landing">This league needs at least two teams.</p>;
  const { a, b } = resolvePair(model, sp.a, sp.b);
  const ta = teamById(model, a)!;
  const tb = teamById(model, b)!;
  const h = headToHead(model, a, b);
  const has = h.games.length > 0;
  const leader = h.aWins === h.bWins ? null : h.aWins > h.bWins ? ta : tb;
  const title = has ? `${ta.name}–${tb.name} rivalry` : `${ta.name} vs. ${tb.name}`;
  const toc: TocItem[] = has
    ? [
        { id: 'summary', label: 'Series summary' },
        { id: 'notable', label: 'Notable games' },
        { id: 'results', label: 'Results' },
        { id: 'see-also', label: 'See also' },
      ]
    : [{ id: 'see-also', label: 'See also' }];
  const teamsList = model.franchises.map((f) => ({ id: f.id, name: f.name, active: f.active }));
  const margin = (g: OrientedGame | null) => (g ? Math.abs(g.us - g.them) : 0);

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="h2h" />
      <PageHeading title={title} />
      <TeamPickers leagueId={leagueId} mode="h2h" teams={teamsList} a={a} b={b} />

      <div className="scoreboard" aria-label="Series score">
        <div className="sb-side">
          <span className="sb-ring" style={{ background: ta.palette.primary }}>
            <Avatar team={ta} size={52} />
          </span>
          <div>
            <div className="sb-name">
              <Link href={routes.team(leagueId, ta.id)} prefetch={false}>
                {ta.name}
              </Link>
            </div>
            <div className="sb-sub">{ta.manager}</div>
          </div>
        </div>
        <div className="sb-score tnum" aria-label={`Series ${h.aWins} to ${h.bWins}`}>
          <span className={h.aWins > h.bWins ? 'lead' : undefined}>{h.aWins}</span>
          <small>{h.ties ? `${h.ties} tie${h.ties > 1 ? 's' : ''}` : 'Series'}</small>
          <span className={h.bWins > h.aWins ? 'lead' : undefined}>{h.bWins}</span>
        </div>
        <div className="sb-side sb-side--b">
          <span className="sb-ring" style={{ background: tb.palette.primary }}>
            <Avatar team={tb} size={52} />
          </span>
          <div>
            <div className="sb-name">
              <Link href={routes.team(leagueId, tb.id)} prefetch={false}>
                {tb.name}
              </Link>
            </div>
            <div className="sb-sub">{tb.manager}</div>
          </div>
        </div>
      </div>

      <p className="lede">
        {has ? (
          <>
            The <b>{title}</b> is a series in the{' '}
            <Link href={routes.league(leagueId)} prefetch={false}>
              {model.name}
            </Link>
            . The teams have met {h.games.length} {h.games.length === 1 ? 'time' : 'times'} ({h.regular.games} in the regular season,{' '}
            {h.postseason.games} in the postseason);{' '}
            {leader ? (
              <>
                the <TeamLink leagueId={leagueId} team={leader} size={0} /> lead the series {Math.max(h.aWins, h.bWins)}–
                {Math.min(h.aWins, h.bWins)}
              </>
            ) : (
              <>the series is tied {h.aWins}–{h.bWins}</>
            )}
            .{' '}
            {h.streak && h.streak.length > 1 ? (
              <>
                The <TeamLink leagueId={leagueId} team={teamById(model, h.streak.holder)} size={0} /> have won the last{' '}
                {h.streak.length} meetings.
              </>
            ) : null}
          </>
        ) : (
          <>
            The {ta.name} and the {tb.name} have never played each other
            {ta.active && tb.active ? '' : ', since their seasons in the league did not overlap'}.
          </>
        )}
      </p>
      <TocMobile toc={toc} />

      {has ? (
        <>
          <Section id="summary" title="Series summary">
            <div className="tbl">
              <table className="wikitable">
                <thead>
                  <tr>
                    <th scope="col">Statistic</th>
                    <th scope="col">
                      <TeamLink leagueId={leagueId} team={ta} />
                    </th>
                    <th scope="col">
                      <TeamLink leagueId={leagueId} team={tb} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Wins (all games)</th>
                    <td className="num">{h.aWins}</td>
                    <td className="num">{h.bWins}</td>
                  </tr>
                  <tr>
                    <th scope="row">Regular-season wins</th>
                    <td className="num">{h.regular.aWins}</td>
                    <td className="num">{h.regular.bWins}</td>
                  </tr>
                  <tr>
                    <th scope="row">Postseason wins</th>
                    <td className="num">{h.postseason.aWins}</td>
                    <td className="num">{h.postseason.bWins}</td>
                  </tr>
                  <tr>
                    <th scope="row">Points scored</th>
                    <td className="num">{pts(h.aPts, 1)}</td>
                    <td className="num">{pts(h.bPts, 1)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Points per meeting</th>
                    <td className="num">{pts(h.aAvg)}</td>
                    <td className="num">{pts(h.bAvg)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Longest winning streak</th>
                    <td className="num">{h.longestA}</td>
                    <td className="num">{h.longestB}</td>
                  </tr>
                  <tr>
                    <th scope="row">Biggest win</th>
                    <td className="num">{h.aBiggestWin ? `${signed(margin(h.aBiggestWin))} (${h.aBiggestWin.season})` : '—'}</td>
                    <td className="num">{h.bBiggestWin ? `${signed(margin(h.bBiggestWin))} (${h.bBiggestWin.season})` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="notable" title="Notable games">
            <ul>
              {h.closest ? (
                <li>
                  <b>Closest game:</b> {h.closest.season}, week {h.closest.week} — {ta.abbr} {pts(h.closest.us)}, {tb.abbr}{' '}
                  {pts(h.closest.them)} ({pts(margin(h.closest))} points).
                </li>
              ) : null}
              {h.aBiggestWin ? (
                <li>
                  <b>{possessive(ta.name)} biggest win:</b> {pts(h.aBiggestWin.us)}–{pts(h.aBiggestWin.them)} in {h.aBiggestWin.season}, week{' '}
                  {h.aBiggestWin.week}.
                </li>
              ) : null}
              {h.bBiggestWin ? (
                <li>
                  <b>{possessive(tb.name)} biggest win:</b> {pts(h.bBiggestWin.them)}–{pts(h.bBiggestWin.us)} in {h.bBiggestWin.season}, week{' '}
                  {h.bBiggestWin.week}.
                </li>
              ) : null}
              {h.games
                .filter((g) => g.kind !== 'regular')
                .map((g) => (
                  <li key={g.id}>
                    <b>
                      {g.season} {gameLabel(g).toLowerCase()}:
                    </b>{' '}
                    {g.result === 'W' ? ta.name : g.result === 'L' ? tb.name : 'Neither team'} won, {pts(Math.max(g.us, g.them))}–
                    {pts(Math.min(g.us, g.them))}.
                  </li>
                ))}
            </ul>
          </Section>

          <Section id="results" title="Results">
            <div className="tbl">
              <table className="wikitable">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Season</th>
                    <th scope="col">Week</th>
                    <th scope="col">Game</th>
                    <th scope="col">{ta.abbr}</th>
                    <th scope="col">{tb.abbr}</th>
                    <th scope="col">Winner</th>
                    <th scope="col">Series</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let wa = 0;
                    let wb = 0;
                    return h.games.map((g, i) => {
                      if (g.result === 'W') wa++;
                      else if (g.result === 'L') wb++;
                      return (
                        <tr key={g.id}>
                          <td className="num">{i + 1}</td>
                          <td>
                            <Link href={routes.season(leagueId, g.season)} prefetch={false}>
                              {g.season}
                            </Link>
                          </td>
                          <td className="num">{g.week}</td>
                          <td className={g.kind === 'regular' ? undefined : 'res-playoffs'}>{gameLabel(g)}</td>
                          <td className="num" style={{ fontWeight: g.result === 'W' ? 700 : 400 }}>
                            {pts(g.us)}
                          </td>
                          <td className="num" style={{ fontWeight: g.result === 'L' ? 700 : 400 }}>
                            {pts(g.them)}
                          </td>
                          <td>{g.result === 'T' ? 'Tie' : g.result === 'W' ? ta.abbr : tb.abbr}</td>
                          <td className="num">{recordText(wa, wb)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      ) : null}

      <Section id="see-also" title="See also">
        <ul>
          <li>
            <Link href={routes.compare(leagueId, a, b)} prefetch={false}>
              Legacy comparison: {ta.name} vs. {tb.name}
            </Link>
          </li>
          <li>
            <TeamLink leagueId={leagueId} team={ta} size={0} /> · <TeamLink leagueId={leagueId} team={tb} size={0} />
          </li>
          <li>
            <Link href={routes.league(leagueId)} prefetch={false}>
              Rivalries in the {model.name}
            </Link>
          </li>
        </ul>
      </Section>
      <Navbox model={model} />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
