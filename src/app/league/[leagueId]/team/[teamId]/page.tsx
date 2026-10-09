import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { Avatar, PosPill, TeamLink, Trophy } from '@/components/bits';
import { Sortable } from '@/components/client/ArticleEnhancers';
import { StoryBlock } from '@/components/client/Stories';
import { PointsPerGameChart } from '@/components/charts';
import { TradeCard, resultClass } from '@/components/league';
import { Swatches, UniformSet } from '@/components/Uniform';
import {
  ArticleFrame,
  Categories,
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
  linkTable,
  type TocItem,
} from '@/components/wiki';
import { slug } from '@/components/WikiText';
import { getLeagueModel } from '@/lib/league';
import { RESULT_LABEL, ordinal, percent, pts, recordText, seasonSpan, winPct } from '@/lib/format';
import { routes } from '@/lib/routes';
import { peekStory, publicStory } from '@/lib/story';
import { leagueAverages, teamById, teamView } from '@/lib/views';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ leagueId: string; teamId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { leagueId, teamId } = await params;
  const model = await getLeagueModel(leagueId);
  const team = model ? teamById(model, decodeURIComponent(teamId)) : null;
  return { title: team?.name ?? 'Team' };
}

const yearLinks = (leagueId: string, seasons: string[]) =>
  seasons.length
    ? seasons.map((s, i) => (
        <span key={s}>
          {i ? ', ' : ''}
          <Link href={routes.season(leagueId, s)} prefetch={false}>
            {s}
          </Link>
        </span>
      ))
    : 'None';

export default async function TeamPage({ params }: Props) {
  const t0 = performance.now();
  const { leagueId, teamId } = await params;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  const view = teamView(model, decodeURIComponent(teamId));
  if (!view) notFound();
  const { team: f, opponents, trades, rival } = view;
  const p = f.palette;
  const story = await peekStory(model, f.id);
  const links = linkTable(model);
  const leagueAvg = leagueAverages(model);
  const head: CSSProperties = { background: p.primary, color: p.onPrimary, borderBottom: `3px solid ${p.secondary}` };
  const sub: CSSProperties = { background: p.secondary, color: p.onSecondary };
  const played = f.seasons.filter((s) => s.result !== 'upcoming');
  const sbSeasons = f.seasons.filter((s) => s.startBench.decisions > 0);

  const storyToc: TocItem[] = story
    ? story.article.sections.map((s) => ({ id: `story-${slug(s.heading)}`, label: s.heading }))
    : [];
  const toc: TocItem[] = [
    ...storyToc,
    { id: 'uniform', label: 'Logos and uniforms' },
    { id: 'seasons', label: 'Season-by-season' },
    { id: 'statistics', label: 'Statistics' },
    { id: 'hall-of-fame', label: 'Hall of Fame' },
    { id: 'start-sit', label: 'Start/sit record' },
    { id: 'head-to-head', label: 'Head-to-head records' },
    ...(trades.length ? [{ id: 'trades', label: 'Trades' }] : []),
    { id: 'see-also', label: 'See also' },
  ];

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="team" />
      <PageHeading title={f.name} />
      <Hatnote>
        This article is about the franchise. For the league, see{' '}
        <Link href={routes.league(leagueId)} prefetch={false}>
          {model.name}
        </Link>
        .
      </Hatnote>

      <Infobox title={f.name} headerStyle={head} image={<Avatar team={f} src={f.avatarUrl} size={140} />} caption={f.avatarUrl ? 'Team logo' : 'No logo uploaded'}>
        <InfoHeader style={sub}>Franchise</InfoHeader>
        <InfoRow label="Manager">
          {f.manager}
          {f.active ? null : <span className="muted"> (former franchise)</span>}
        </InfoRow>
        <InfoRow label="Established">
          <Link href={routes.season(leagueId, f.firstSeason)} prefetch={false}>
            {f.firstSeason}
          </Link>
        </InfoRow>
        <InfoRow label="Seasons">
          {played.length} ({seasonSpan(f.firstSeason, f.lastSeason, f.active)})
        </InfoRow>
        <InfoRow label="Team colors">
          <Swatches palette={p} compact />
          {p.names.join(', ')}
        </InfoRow>
        {f.nameHistory.length > 1 ? (
          <InfoRow label="Former names">
            <ul>
              {f.nameHistory.slice(0, -1).map((n) => (
                <li key={n.name + n.from}>
                  {n.name} ({n.from === n.to ? n.from : `${n.from}–${n.to}`})
                </li>
              ))}
            </ul>
          </InfoRow>
        ) : null}
        <InfoHeader style={sub}>Record</InfoHeader>
        <InfoRow label="Regular season">
          {recordText(f.regular.w, f.regular.l, f.regular.t)} ({winPct(f.regular.w, f.regular.l, f.regular.t)})
        </InfoRow>
        <InfoRow label="Playoffs">{recordText(f.playoffs.w, f.playoffs.l)}</InfoRow>
        <InfoRow label="Points per game">
          {pts(f.regular.avgPF)} <span className="muted">(allowed {pts(f.regular.avgPA)})</span>
        </InfoRow>
        <InfoHeader style={sub}>Championships</InfoHeader>
        <InfoRow label={`League titles (${f.titles.length})`}>
          {f.titles.length ? (
            <>
              <Trophy /> {yearLinks(leagueId, f.titles)}
            </>
          ) : (
            'None'
          )}
        </InfoRow>
        <InfoRow label={`Runner-up (${f.runnerUps.length})`}>{yearLinks(leagueId, f.runnerUps)}</InfoRow>
        <InfoRow label={`Playoff appearances (${f.playoffApps.length})`}>{yearLinks(leagueId, f.playoffApps)}</InfoRow>
        <InfoHeader style={sub}>Legacy</InfoHeader>
        <InfoRow label="Legacy Score">
          {pts(f.legacy.score, 0)}{' '}
          <span className="muted">
            ({ordinal(f.legacy.rank)} of {model.franchises.length})
          </span>
        </InfoRow>
        <InfoRow label="Primary rival">{rival ? <TeamLink leagueId={leagueId} team={rival} /> : '—'}</InfoRow>
        <InfoRow label="Start/sit success">
          {percent(f.startBench.rate)}
          {f.startBench.rank ? <span className="muted"> ({ordinal(f.startBench.rank)})</span> : null}
        </InfoRow>
      </Infobox>

      <StoryBlock
        leagueId={leagueId}
        teamId={f.id}
        teamName={f.name}
        initial={story ? publicStory(story) : null}
        initialCanRetry={Boolean(story?.error)}
        links={links}
      />
      <TocMobile toc={toc} />

      <Section id="uniform" title="Logos and uniforms">
        <p>
          {p.source === 'logo' ? (
            <>
              The team’s colors are {p.names[0].toLowerCase()}, {p.names[1].toLowerCase()} and {p.names[2].toLowerCase()}, sampled
              from its Sleeper logo.
            </>
          ) : (
            <>The team has no logo on Sleeper, so LegacyWiki assigned it a palette.</>
          )}{' '}
          Uniforms carry the franchise number, No. {f.jerseyNumber}, from its roster slot.
        </p>
        <Swatches palette={p} />
        <UniformSet team={f} />
      </Section>

      <Section id="seasons" title="Season-by-season">
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Season</th>
                <th scope="col">Team name</th>
                <th scope="col">W</th>
                <th scope="col">L</th>
                <th scope="col">T</th>
                <th scope="col">Pct.</th>
                <th scope="col">PF</th>
                <th scope="col">PA</th>
                <th scope="col">PF/G</th>
                <th scope="col">Standing</th>
                <th scope="col">Postseason</th>
                <th scope="col">Top player</th>
              </tr>
            </thead>
            <tbody>
              {f.seasons.map((s) => (
                <tr key={s.season}>
                  <td>
                    <Link href={routes.season(leagueId, s.season)} prefetch={false}>
                      {s.season}
                    </Link>
                  </td>
                  <td>{s.teamName}</td>
                  <td className="num">{s.w}</td>
                  <td className="num">{s.l}</td>
                  <td className="num">{s.t}</td>
                  <td className="num">{winPct(s.w, s.l, s.t)}</td>
                  <td className="num">{pts(s.pf, 1)}</td>
                  <td className="num">{pts(s.pa, 1)}</td>
                  <td className="num">{pts(s.avgPF)}</td>
                  <td className="num">{s.result === 'upcoming' ? '—' : ordinal(s.rank)}</td>
                  <td className={resultClass(s.result)}>
                    {RESULT_LABEL[s.result]}
                    {s.finish && (s.result === 'playoffs' || s.result === 'missed') ? <span className="muted"> ({ordinal(s.finish)})</span> : null}
                  </td>
                  <td>
                    {s.topPlayers[0] ? (
                      <>
                        <PosPill pos={s.topPlayers[0].pos} /> {s.topPlayers[0].name}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="statistics" title="Statistics">
        <PointsPerGameChart team={f} leagueAvg={leagueAvg} />
        <div className="tbl">
          <table className="wikitable">
            <tbody>
              <tr>
                <th scope="row">Points for (regular season)</th>
                <td className="num">{pts(f.regular.pf, 1)}</td>
                <th scope="row">Per game</th>
                <td className="num">{pts(f.regular.avgPF)}</td>
              </tr>
              <tr>
                <th scope="row">Points against</th>
                <td className="num">{pts(f.regular.pa, 1)}</td>
                <th scope="row">Per game</th>
                <td className="num">{pts(f.regular.avgPA)}</td>
              </tr>
              <tr>
                <th scope="row">Playoff points for</th>
                <td className="num">{pts(f.playoffs.pf, 1)}</td>
                <th scope="row">Per game</th>
                <td className="num">{f.playoffs.games ? pts(f.playoffs.pf / f.playoffs.games) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="hall-of-fame" title="Hall of Fame">
        <p>The best seasons any player has given this franchise, counting only points scored in its starting lineup.</p>
        <h3>Best season at each position</h3>
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Pos.</th>
                <th scope="col">Player</th>
                <th scope="col">Season</th>
                <th scope="col">Points</th>
                <th scope="col">Starts</th>
                <th scope="col">Per start</th>
              </tr>
            </thead>
            <tbody>
              {f.hallOfFame.byPosition.map((h) => (
                <tr key={h.pos}>
                  <td className="c">
                    <PosPill pos={h.pos} />
                  </td>
                  <td>{h.name}</td>
                  <td>
                    <Link href={routes.season(leagueId, h.season)} prefetch={false}>
                      {h.season}
                    </Link>
                  </td>
                  <td className="num">{pts(h.points, 1)}</td>
                  <td className="num">{h.starts}</td>
                  <td className="num">{pts(h.points / Math.max(1, h.starts))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Team MVP by season</h3>
        <div className="tbl">
          <table className="wikitable">
            <thead>
              <tr>
                <th scope="col">Season</th>
                <th scope="col">Player</th>
                <th scope="col">Pos.</th>
                <th scope="col">Points</th>
                <th scope="col">Starts</th>
              </tr>
            </thead>
            <tbody>
              {f.hallOfFame.bySeason.map((h) => (
                <tr key={h.season}>
                  <td>{h.season}</td>
                  <td>{h.name}</td>
                  <td className="c">
                    <PosPill pos={h.pos} />
                  </td>
                  <td className="num">{pts(h.points, 1)}</td>
                  <td className="num">{h.starts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="start-sit" title="Start/sit record">
        <p>
          The {f.name} started the better option {percent(f.startBench.rate)} of the time ({f.startBench.correct} of{' '}
          {f.startBench.decisions} lineup decisions)
          {f.startBench.rank ? `, ${ordinal(f.startBench.rank)} in the league` : ''}. A decision counts as correct when the
          starter scored at least as much as the best bench player eligible for that slot.
        </p>
        {sbSeasons.length ? (
          <div className="tbl">
            <table className="wikitable">
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col">Decisions</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                {sbSeasons.map((s) => (
                  <tr key={s.season}>
                    <td>{s.season}</td>
                    <td className="num">{s.startBench.decisions}</td>
                    <td className="num">{s.startBench.correct}</td>
                    <td className="num">{percent(s.startBench.correct / s.startBench.decisions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {f.startBench.blunders.length ? (
          <>
            <h3>Costliest benchings</h3>
            <div className="tbl">
              <table className="wikitable">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Slot</th>
                    <th scope="col">Started</th>
                    <th scope="col">Benched</th>
                    <th scope="col">Points lost</th>
                  </tr>
                </thead>
                <tbody>
                  {f.startBench.blunders.map((b) => (
                    <tr key={`${b.season}-${b.week}-${b.slot}-${b.benchId}`}>
                      <td className="nowrap">
                        {b.season} wk {b.week}
                      </td>
                      <td className="c">{b.slot}</td>
                      <td>
                        {b.starterName} <span className="muted tnum">({pts(b.starterPts, 1)})</span>
                      </td>
                      <td>
                        {b.benchName} <span className="muted tnum">({pts(b.benchPts, 1)})</span>
                      </td>
                      <td className="num">{pts(b.cost, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Section>

      <Section id="head-to-head" title="Head-to-head records">
        <Sortable>
          <table className="wikitable">
            <thead>
              <tr>
                <th data-sort="text" scope="col">Opponent</th>
                <th data-sort="num" scope="col">Meetings</th>
                <th data-sort="num" scope="col">W</th>
                <th data-sort="num" scope="col">L</th>
                <th data-sort="num" scope="col">T</th>
                <th data-sort="num" scope="col">PF</th>
                <th data-sort="num" scope="col">PA</th>
                <th data-sort="num" scope="col">Playoff mtgs</th>
                <th scope="col">Articles</th>
              </tr>
            </thead>
            <tbody>
              {opponents.map((o) => {
                const opp = teamById(model, o.opponentId);
                return (
                  <tr key={o.opponentId}>
                    <td data-sort-value={opp?.name}>
                      <TeamLink leagueId={leagueId} team={opp} strong={o.opponentId === f.rivalId} />
                    </td>
                    <td className="num">{o.games}</td>
                    <td className="num">{o.wins}</td>
                    <td className="num">{o.losses}</td>
                    <td className="num">{o.ties}</td>
                    <td className="num">{pts(o.pf, 1)}</td>
                    <td className="num">{pts(o.pa, 1)}</td>
                    <td className="num">{o.playoffGames}</td>
                    <td className="nowrap small">
                      <Link href={routes.h2h(leagueId, f.id, o.opponentId)} prefetch={false}>
                        H2H
                      </Link>{' '}
                      ·{' '}
                      <Link href={routes.compare(leagueId, f.id, o.opponentId)} prefetch={false}>
                        Compare
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Sortable>
      </Section>

      {trades.length ? (
        <Section id="trades" title="Trades" meta={`${trades.length} total`}>
          {trades.map((t) => (
            <TradeCard key={t.id} model={model} trade={t} />
          ))}
        </Section>
      ) : null}

      <Section id="see-also" title="See also">
        <ul>
          {rival ? (
            <>
              <li>
                <Link href={routes.h2h(leagueId, f.id, rival.id)} prefetch={false}>
                  {f.name}–{rival.name} rivalry
                </Link>
              </li>
              <li>
                <Link href={routes.compare(leagueId, f.id, rival.id)} prefetch={false}>
                  Legacy comparison with the {rival.name}
                </Link>
              </li>
            </>
          ) : null}
          <li>
            <Link href={routes.league(leagueId)} prefetch={false}>
              {model.name} Legacy standings
            </Link>
          </li>
        </ul>
      </Section>

      <Navbox model={model} team={f} />
      <Categories
        items={[
          { label: `${model.name} teams`, href: routes.teams(leagueId) },
          { label: `Teams established in ${f.firstSeason}`, href: routes.season(leagueId, f.firstSeason) },
          f.titles.length
            ? { label: 'Championship-winning teams', href: routes.league(leagueId) }
            : { label: 'Teams without a championship', href: routes.league(leagueId) },
        ]}
      />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
