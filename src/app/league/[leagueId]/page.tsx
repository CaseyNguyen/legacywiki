import Link from 'next/link';
import { Avatar, BrandMark, PosPill, TeamLink, Trophy } from '@/components/bits';
import { Sortable } from '@/components/client/ArticleEnhancers';
import { FranchiseCards, type FranchiseCardData } from '@/components/client/Stories';
import { LegacyBar, SeasonGrid, StandingsList, TradeCard } from '@/components/league';
import {
  ArticleFrame,
  Categories,
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
import { excerpt } from '@/components/WikiText';
import { getLeagueModel } from '@/lib/league';
import { longDate, percent, pts, recordText, winPct } from '@/lib/format';
import { routes } from '@/lib/routes';
import { aiEnabled, peekStory } from '@/lib/story';
import { legacyStandings, teamById } from '@/lib/views';

export const dynamic = 'force-dynamic';

export default async function LeagueOverview({ params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;

  const team = (id: string | null | undefined) => (id ? teamById(model, id) : null);
  const standings = legacyStandings(model);
  const maxScore = Math.max(1, ...standings.map((r) => r.legacyScore));
  const played = model.seasons.filter((s) => s.state !== 'upcoming');
  const completed = model.seasons.filter((s) => s.state === 'complete');
  const current = model.seasons[model.seasons.length - 1];
  const reigning = [...completed].reverse().find((s) => s.champion);
  const leader = model.franchises[0];
  const mostTitles = [...model.franchises].sort((a, b) => b.titles.length - a.titles.length)[0];
  const first = model.seasons[0]?.season ?? '';
  const rec = model.records;

  const stories = await Promise.all(model.franchises.map((f) => peekStory(model, f.id)));
  const cards: FranchiseCardData[] = model.franchises.map((f, i) => ({
    id: f.id,
    name: f.name,
    manager: f.manager,
    href: routes.team(leagueId, f.id),
    abbr: f.abbr,
    avatarThumbUrl: f.avatarThumbUrl,
    palette: { primary: f.palette.primary, onPrimary: f.palette.onPrimary, secondary: f.palette.secondary, names: f.palette.names },
    active: f.active,
    titles: f.titles.length,
    record: recordText(f.regular.w, f.regular.l, f.regular.t),
    playoffApps: f.playoffApps.length,
    legacyRank: f.legacy.rank,
    excerpt: stories[i] ? excerpt(stories[i]!.article.lede) : null,
  }));

  const sbRows = [...model.franchises].sort(
    (a, b) => (b.startBench.decisions >= 20 ? b.startBench.rate ?? 0 : -1) - (a.startBench.decisions >= 20 ? a.startBench.rate ?? 0 : -1),
  );
  const rivalries = model.rivalries.slice(0, 6).map((k) => model.pairs[k]);
  const finalOf = (season: (typeof model.seasons)[number]) => season.bracket.find((g) => g.placement === 1);

  const toc: TocItem[] = [
    { id: 'legacy-standings', label: 'Legacy standings' },
    { id: 'franchises', label: 'Franchises' },
    { id: 'championships', label: 'Championship history' },
    { id: 'season-by-season', label: 'Season-by-season results' },
    { id: 'all-time', label: 'All-time records' },
    { id: 'rivalries', label: 'Rivalries' },
    { id: 'trades', label: 'Best trades' },
    { id: 'start-sit', label: 'Start/sit accuracy' },
    { id: 'records', label: 'League records' },
    { id: 'notes', label: 'Notes' },
  ];

  const recordGame = (gameId: string | undefined) => (gameId ? model.games[gameId] : null);
  const blowout = recordGame(rec.biggestBlowout?.gameId);
  const closest = recordGame(rec.closestGame?.gameId);

  const body = (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="overview" />
      <PageHeading title={model.name} />

      <Infobox
        title={model.name}
        image={model.avatarUrl ? <Avatar src={model.avatarUrl} size={140} /> : <BrandMark className="ib-mark" />}
        caption={model.source === 'demo' ? 'Demo league (fictional)' : 'League avatar'}
      >
        <InfoRow label="Sport">American football (fantasy)</InfoRow>
        <InfoRow label="Founded">{first}</InfoRow>
        <InfoRow label="Platform">Sleeper</InfoRow>
        <InfoRow label="Format">
          {model.format.leagueType}, {model.format.scoring}
        </InfoRow>
        <InfoRow label="Teams">{model.format.teams}</InfoRow>
        <InfoRow label="Playoff teams">{model.format.playoffTeams || '—'}</InfoRow>
        <InfoRow label="Seasons">
          {played.length} ({first}–{current?.state === 'complete' ? current.season : 'present'})
        </InfoRow>
        <InfoHeader>Champions</InfoHeader>
        <InfoRow label="Most recent">
          {reigning ? (
            <>
              <TeamLink leagueId={leagueId} team={team(reigning.champion)} /> ({reigning.season})
            </>
          ) : (
            'None yet'
          )}
        </InfoRow>
        <InfoRow label="Most titles">
          {mostTitles && mostTitles.titles.length ? (
            <>
              <TeamLink leagueId={leagueId} team={mostTitles} /> ({mostTitles.titles.length})
            </>
          ) : (
            '—'
          )}
        </InfoRow>
        <InfoRow label="Legacy leader">
          <TeamLink leagueId={leagueId} team={leader} /> ({pts(leader.legacy.score, 0)})
        </InfoRow>
        {current && current.state === 'in-progress' ? (
          <InfoRow label="Current season">
            <Link href={routes.season(leagueId, current.season)} prefetch={false}>
              {current.season}
            </Link>{' '}
            <span className="chip chip--live">Week {current.weeksPlayed + 1}</span>
          </InfoRow>
        ) : null}
      </Infobox>

      <p className="lede">
        The <b>{model.name}</b> is a {model.format.teams}-team {model.format.leagueType.toLowerCase()} fantasy football league
        on Sleeper, founded in {first}. {model.franchises.length} franchises have competed across {played.length}{' '}
        {played.length === 1 ? 'season' : 'seasons'}.{' '}
        {mostTitles && mostTitles.titles.length ? (
          mostTitles.id === leader.id ? (
            <>
              The <TeamLink leagueId={leagueId} team={leader} size={0} /> have won the most championships (
              {leader.titles.length}) and lead the all-time Legacy Score standings.{' '}
            </>
          ) : (
            <>
              The <TeamLink leagueId={leagueId} team={mostTitles} size={0} /> have won the most championships (
              {mostTitles.titles.length}), while the <TeamLink leagueId={leagueId} team={leader} size={0} /> lead the
              all-time Legacy Score standings.{' '}
            </>
          )
        ) : (
          <>
            No one has won a title yet; the <TeamLink leagueId={leagueId} team={leader} size={0} /> lead the Legacy Score
            standings.{' '}
          </>
        )}
        {current?.state === 'in-progress' ? (
          <>
            The{' '}
            <Link href={routes.season(leagueId, current.season)} prefetch={false}>
              {current.season} season
            </Link>{' '}
            is under way after {current.weeksPlayed} {current.weeksPlayed === 1 ? 'week' : 'weeks'}, with the{' '}
            <TeamLink leagueId={leagueId} team={team(current.standings[0]?.franchiseId)} size={0} /> on top of the standings.
          </>
        ) : reigning ? (
          <>
            The <TeamLink leagueId={leagueId} team={team(reigning.champion)} size={0} /> are the reigning champions.
          </>
        ) : null}
      </p>
      <TocMobile toc={toc} />

      <Section id="legacy-standings" title="Legacy standings" meta="All-time" lead>
        <p>
          Legacy Score rewards titles first and sustained winning second.<sup><a href="#note-legacy">[a]</a></sup> Pick a
          year in the header to see that season’s standings instead.
        </p>
        <StandingsList
          leagueId={leagueId}
          label="Legacy standings"
          items={standings.map((r) => ({
            key: r.id,
            rank: r.rank,
            team: team(r.id)!,
            sub: `${r.titles} ${r.titles === 1 ? 'title' : 'titles'} · ${r.playoffApps} playoff ${r.playoffApps === 1 ? 'trip' : 'trips'} · ${recordText(r.record.w, r.record.l, r.record.t)}${r.active ? '' : ' · former'}`,
            stat: pts(r.legacyScore, 0),
            statLabel: 'Legacy',
            barPct: (r.legacyScore / maxScore) * 100,
          }))}
        />
        <Sortable className="desktop-table">
          <table className="wikitable">
            <thead>
              <tr>
                <th data-sort="num" scope="col">#</th>
                <th data-sort="text" scope="col">Team</th>
                <th data-sort="num" scope="col">Legacy Score</th>
                <th data-sort="num" scope="col" title="Championships (Super Bowl wins)">Titles</th>
                <th data-sort="num" scope="col" title="Playoff appearances">Playoffs</th>
                <th data-sort="num" scope="col" title="Regular-season record">Record</th>
                <th data-sort="num" scope="col" title="Points for per game">PF/G</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((r) => {
                const f = team(r.id)!;
                return (
                  <tr key={r.id} className={r.active ? undefined : 'is-dim'}>
                    <td className="num">{r.rank}</td>
                    <td data-sort-value={r.name}>
                      <TeamLink leagueId={leagueId} team={f} strong={r.rank === 1} />
                      {r.active ? null : <span className="muted small"> (former)</span>}
                    </td>
                    <td data-sort-value={r.legacyScore}>
                      <LegacyBar score={r.legacyScore} max={maxScore} />
                    </td>
                    <td className="num" data-sort-value={r.titles}>
                      {r.titles ? (
                        <>
                          {r.titles} <Trophy />
                        </>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="num">{r.playoffApps}</td>
                    <td className="num" data-sort-value={r.winPct} title={`${winPct(r.record.w, r.record.l, r.record.t)} over ${r.seasons} seasons`}>
                      {recordText(r.record.w, r.record.l, r.record.t)}
                    </td>
                    <td className="num">{pts(r.avgPF)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Sortable>
      </Section>

      <Section id="franchises" title="Franchises" meta={`${model.franchises.length} teams`}>
        <p>
          Every team that has played in the league, in Legacy Score order.{' '}
          <Link href={routes.teams(leagueId)} prefetch={false}>
            See the full list of teams
          </Link>
          .
        </p>
        <FranchiseCards leagueId={leagueId} cards={cards} aiEnabled={aiEnabled()} />
      </Section>

      <Section id="championships" title="Championship history">
        <p>League champions, the winners of each season’s Super Bowl, with the final score and the season’s top performers.</p>
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Season</th>
                <th scope="col">Champion</th>
                <th scope="col">Score</th>
                <th scope="col">Runner-up</th>
                <th scope="col">Third place</th>
                <th scope="col">Best record</th>
                <th scope="col">Season MVP</th>
              </tr>
            </thead>
            <tbody>
              {[...model.seasons].reverse().map((s) => {
                const fin = finalOf(s);
                const champFirst = fin && fin.winner === fin.a;
                const score = fin && fin.aPts != null && fin.bPts != null ? (champFirst ? `${pts(fin.aPts)}–${pts(fin.bPts)}` : `${pts(fin.bPts)}–${pts(fin.aPts)}`) : null;
                return (
                  <tr key={s.season}>
                    <td>
                      <Link href={routes.season(leagueId, s.season)} prefetch={false}>
                        {s.season}
                      </Link>
                    </td>
                    {s.champion ? (
                      <td className="res-champion">
                        <TeamLink leagueId={leagueId} team={team(s.champion)} strong />
                      </td>
                    ) : (
                      <td className="muted">{s.state === 'in-progress' ? <span className="chip chip--live">In progress</span> : '—'}</td>
                    )}
                    <td className="num">{score ?? '—'}</td>
                    <td>{s.runnerUp ? <TeamLink leagueId={leagueId} team={team(s.runnerUp)} /> : '—'}</td>
                    <td>{s.third ? <TeamLink leagueId={leagueId} team={team(s.third)} /> : '—'}</td>
                    <td>
                      {s.standings[0] && s.state !== 'upcoming' ? (
                        <>
                          <TeamLink leagueId={leagueId} team={team(s.standings[0].franchiseId)} />{' '}
                          <span className="muted tnum nowrap">({recordText(s.standings[0].w, s.standings[0].l, s.standings[0].t)})</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {s.mvp ? (
                        <>
                          <span className="nowrap"><PosPill pos={s.mvp.pos} /> {s.mvp.name}</span> <span className="muted tnum nowrap">({pts(s.mvp.points, 1)})</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="season-by-season" title="Season-by-season results" meta="Playoff appearances and titles">
        <SeasonGrid model={model} />
      </Section>

      <Section id="all-time" title="All-time records">
        <p>Regular-season records and scoring averages (points per game), plus playoff records on the championship path.</p>
        <Sortable>
          <table className="wikitable">
            <thead>
              <tr>
                <th data-sort="text" scope="col">Team</th>
                <th data-sort="num" scope="col">W</th>
                <th data-sort="num" scope="col">L</th>
                <th data-sort="num" scope="col">T</th>
                <th data-sort="num" scope="col">Pct.</th>
                <th data-sort="num" scope="col">PF</th>
                <th data-sort="num" scope="col">PA</th>
                <th data-sort="num" scope="col">PF/G</th>
                <th data-sort="num" scope="col">PA/G</th>
                <th data-sort="num" scope="col">Playoffs</th>
              </tr>
            </thead>
            <tbody>
              {[...model.franchises]
                .sort((a, b) => b.regular.winPct - a.regular.winPct || b.regular.pf - a.regular.pf)
                .map((f) => (
                  <tr key={f.id}>
                    <td data-sort-value={f.name}>
                      <TeamLink leagueId={leagueId} team={f} />
                    </td>
                    <td className="num">{f.regular.w}</td>
                    <td className="num">{f.regular.l}</td>
                    <td className="num">{f.regular.t}</td>
                    <td className="num" data-sort-value={f.regular.winPct}>
                      {winPct(f.regular.w, f.regular.l, f.regular.t)}
                    </td>
                    <td className="num">{pts(f.regular.pf, 1)}</td>
                    <td className="num">{pts(f.regular.pa, 1)}</td>
                    <td className="num">{pts(f.regular.avgPF)}</td>
                    <td className="num">{pts(f.regular.avgPA)}</td>
                    <td className="num" data-sort-value={f.playoffs.w - f.playoffs.l / 100}>
                      {recordText(f.playoffs.w, f.playoffs.l)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Sortable>
      </Section>

      <Section id="rivalries" title="Rivalries">
        <p>
          The league’s most-played matchups, counting regular-season and postseason meetings.{' '}
          <Link href={routes.h2h(leagueId)} prefetch={false}>
            Compare any two teams head-to-head
          </Link>
          .
        </p>
        {rivalries.length ? (
          <div className="tbl">
            <table className="wikitable">
              <thead>
                <tr>
                  <th scope="col">Rivalry</th>
                  <th scope="col">Meetings</th>
                  <th scope="col">Series</th>
                  <th scope="col">Points</th>
                  <th scope="col">Playoff meetings</th>
                  <th scope="col">Last meeting</th>
                </tr>
              </thead>
              <tbody>
                {rivalries.map((p) => {
                  const a = team(p.a)!;
                  const b = team(p.b)!;
                  const leaderTeam = p.aWins === p.bWins ? null : p.aWins > p.bWins ? a : b;
                  const last = model.games[p.gameIds[p.gameIds.length - 1]];
                  return (
                    <tr key={p.key}>
                      <td>
                        <Link href={routes.h2h(leagueId, p.a, p.b)} prefetch={false}>
                          {a.name} – {b.name}
                        </Link>
                      </td>
                      <td className="num">{p.games}</td>
                      <td>
                        {leaderTeam ? (
                          <>
                            {leaderTeam.abbr} leads <span className="tnum">{Math.max(p.aWins, p.bWins)}–{Math.min(p.aWins, p.bWins)}</span>
                          </>
                        ) : (
                          <>Tied <span className="tnum">{p.aWins}–{p.bWins}</span></>
                        )}
                        {p.ties ? <span className="muted"> ({p.ties} tie)</span> : null}
                      </td>
                      <td className="num">
                        {pts(p.aPts, 1)}–{pts(p.bPts, 1)}
                      </td>
                      <td className="num">{p.playoffGames}</td>
                      <td className="nowrap">
                        {last.season} wk {last.week}: {team(last.winner)?.abbr ?? 'Tie'}{' '}
                        <span className="tnum">
                          {pts(Math.max(last.aPts, last.bPts))}–{pts(Math.min(last.aPts, last.bPts))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No team pair has met twice yet.</p>
        )}
      </Section>

      <Section id="trades" title="Best trades" meta={`${model.trades.length} total`}>
        <p>
          Ranked by the gap in points each side started from what it received, from the trade until the players left the
          roster.
        </p>
        {model.trades.slice(0, 3).map((t, i) => (
          <TradeCard key={t.id} model={model} trade={t} rank={i + 1} />
        ))}
        {model.trades.length ? (
          <p>
            <Link href={routes.trades(leagueId)} prefetch={false}>
              See all {model.trades.length} trades →
            </Link>
          </p>
        ) : (
          <p className="muted">No trades have been made yet.</p>
        )}
      </Section>

      <Section id="start-sit" title="Start/sit accuracy">
        <p>
          How often each team’s starter outscored the best bench player who could have filled the same lineup slot.
          Ties count as correct; slots with no eligible bench player don’t count.
        </p>
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Team</th>
                <th scope="col">Decisions</th>
                <th scope="col">Success rate</th>
                <th scope="col">Costliest benching</th>
              </tr>
            </thead>
            <tbody>
              {sbRows.map((f) => {
                const b = f.startBench.blunders[0];
                return (
                  <tr key={f.id}>
                    <td className="num">{f.startBench.rank ?? '—'}</td>
                    <td>
                      <TeamLink leagueId={leagueId} team={f} />
                    </td>
                    <td className="num">{f.startBench.decisions}</td>
                    <td className="num">{percent(f.startBench.rate)}</td>
                    <td className="small">
                      {b ? (
                        <>
                          Started {b.starterName} ({pts(b.starterPts, 1)}) over {b.benchName} ({pts(b.benchPts, 1)}),{' '}
                          {b.season} wk {b.week}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="records" title="League records">
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Record</th>
                <th scope="col">Value</th>
                <th scope="col">Holder</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {rec.highestScore ? (
                <tr>
                  <td>Highest score in a game</td>
                  <td className="num">{pts(rec.highestScore.points)}</td>
                  <td>
                    <TeamLink leagueId={leagueId} team={team(rec.highestScore.franchiseId)} /> <span className="muted">vs {team(rec.highestScore.opponentId)?.name}</span>
                  </td>
                  <td className="nowrap">
                    {rec.highestScore.season}, week {rec.highestScore.week}
                  </td>
                </tr>
              ) : null}
              {rec.lowestScore ? (
                <tr>
                  <td>Lowest score in a game</td>
                  <td className="num">{pts(rec.lowestScore.points)}</td>
                  <td>
                    <TeamLink leagueId={leagueId} team={team(rec.lowestScore.franchiseId)} /> <span className="muted">vs {team(rec.lowestScore.opponentId)?.name}</span>
                  </td>
                  <td className="nowrap">
                    {rec.lowestScore.season}, week {rec.lowestScore.week}
                  </td>
                </tr>
              ) : null}
              {blowout ? (
                <tr>
                  <td>Largest margin of victory</td>
                  <td className="num">{pts(rec.biggestBlowout!.margin)}</td>
                  <td>
                    <TeamLink leagueId={leagueId} team={team(blowout.winner)} />{' '}
                    <span className="muted tnum">
                      {pts(Math.max(blowout.aPts, blowout.bPts))}–{pts(Math.min(blowout.aPts, blowout.bPts))} over{' '}
                      {team(blowout.winner === blowout.a ? blowout.b : blowout.a)?.name}
                    </span>
                  </td>
                  <td className="nowrap">
                    {blowout.season}, week {blowout.week}
                  </td>
                </tr>
              ) : null}
              {closest ? (
                <tr>
                  <td>Closest game</td>
                  <td className="num">{pts(rec.closestGame!.margin)}</td>
                  <td>
                    {closest.winner ? <TeamLink leagueId={leagueId} team={team(closest.winner)} /> : 'Tie'}{' '}
                    <span className="muted tnum">
                      {pts(Math.max(closest.aPts, closest.bPts))}–{pts(Math.min(closest.aPts, closest.bPts))} vs{' '}
                      {team(closest.winner === closest.a ? closest.b : closest.a)?.name}
                    </span>
                  </td>
                  <td className="nowrap">
                    {closest.season}, week {closest.week}
                  </td>
                </tr>
              ) : null}
              {rec.mostPointsSeason ? (
                <tr>
                  <td>Most points in a regular season</td>
                  <td className="num">{pts(rec.mostPointsSeason.pf, 1)}</td>
                  <td>
                    <TeamLink leagueId={leagueId} team={team(rec.mostPointsSeason.franchiseId)} />
                  </td>
                  <td>{rec.mostPointsSeason.season}</td>
                </tr>
              ) : null}
              {rec.bestRecord ? (
                <tr>
                  <td>Best regular-season record</td>
                  <td className="num">{recordText(rec.bestRecord.w, rec.bestRecord.l, rec.bestRecord.t)}</td>
                  <td>
                    <TeamLink leagueId={leagueId} team={team(rec.bestRecord.franchiseId)} />
                  </td>
                  <td>{rec.bestRecord.season}</td>
                </tr>
              ) : null}
              {rec.longestWinStreak ? (
                <tr>
                  <td>Longest winning streak</td>
                  <td className="num">{rec.longestWinStreak.length} games</td>
                  <td>
                    <TeamLink leagueId={leagueId} team={team(rec.longestWinStreak.franchiseId)} />
                  </td>
                  <td className="nowrap">
                    {rec.longestWinStreak.from.season} wk {rec.longestWinStreak.from.week} – {rec.longestWinStreak.to.season} wk{' '}
                    {rec.longestWinStreak.to.week}
                  </td>
                </tr>
              ) : null}
              {rec.bestPlayerGame ? (
                <tr>
                  <td>Best single-player game</td>
                  <td className="num">{pts(rec.bestPlayerGame.points)}</td>
                  <td>
                    <PosPill pos={rec.bestPlayerGame.pos} /> {rec.bestPlayerGame.name}{' '}
                    <span className="muted">for {team(rec.bestPlayerGame.franchiseId)?.name}</span>
                  </td>
                  <td className="nowrap">
                    {rec.bestPlayerGame.season}, week {rec.bestPlayerGame.week}
                  </td>
                </tr>
              ) : null}
              {rec.bestPlayerSeason ? (
                <tr>
                  <td>Best single-player season</td>
                  <td className="num">{pts(rec.bestPlayerSeason.points, 1)}</td>
                  <td>
                    <PosPill pos={rec.bestPlayerSeason.pos} /> {rec.bestPlayerSeason.name}{' '}
                    <span className="muted">for {team(rec.bestPlayerSeason.franchiseId)?.name}</span>
                  </td>
                  <td>{rec.bestPlayerSeason.season}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="notes" title="Notes">
        <div className="notes">
          <ol type="a">
            <li id="note-legacy">
              <b>Legacy Score</b> adds up each franchise’s accomplishments using these weights:
              <div className="tbl">
                <table className="wikitable">
                  <thead>
                    <tr>
                      <th scope="col">Accomplishment</th>
                      <th scope="col">Points each</th>
                      <th scope="col">Counts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.legacyWeights.map((w) => (
                      <tr key={w.key}>
                        <td>{w.label}</td>
                        <td className="num">{w.weight > 0 ? `+${w.weight}` : `−${Math.abs(w.weight)}`}</td>
                        <td className="small">{w.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          </ol>
          <h3>References</h3>
          <ol>
            <li>
              {model.source === 'demo'
                ? 'Fictional sample data generated by LegacyWiki for demonstration.'
                : `“League, users, rosters, matchups, playoff brackets and transactions.” Sleeper API. Retrieved ${longDate(model.builtAt)}.`}
            </li>
          </ol>
        </div>
      </Section>

      <Navbox model={model} />
      <Categories
        items={[
          { label: 'Fantasy football leagues', href: routes.newLeague() },
          { label: `Leagues established in ${first}`, href: routes.season(leagueId, first) },
          { label: `${model.format.teams}-team leagues`, href: routes.teams(leagueId) },
          { label: `${model.format.scoring} leagues`, href: routes.seasons(leagueId) },
        ]}
      />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
  return body;
}

