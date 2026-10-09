import Link from 'next/link';
import type { Metadata } from 'next';
import { Avatar, TeamLink, Trophy } from '@/components/bits';
import { Sortable } from '@/components/client/ArticleEnhancers';
import { Swatches, Uniform } from '@/components/Uniform';
import { ArticleFrame, Navbox, PageFooter, PageHeading, PageTabs, Section, TocMobile, type TocItem } from '@/components/wiki';
import { getLeagueModel } from '@/lib/league';
import { recordText, seasonSpan, winPct } from '@/lib/format';
import { routes } from '@/lib/routes';
import type { Franchise } from '@/lib/model/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'List of teams' };

function TeamTable({ leagueId, teams }: { leagueId: string; teams: Franchise[] }) {
  return (
    <Sortable>
      <table className="wikitable">
        <thead>
          <tr>
            <th scope="col">Logo</th>
            <th data-sort="text" scope="col">Team</th>
            <th data-sort="text" scope="col">Manager</th>
            <th scope="col">Colors</th>
            <th data-sort="text" scope="col">Seasons</th>
            <th data-sort="num" scope="col">Titles</th>
            <th data-sort="num" scope="col">Record</th>
            <th data-sort="num" scope="col">Legacy</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((f) => (
            <tr key={f.id}>
              <td className="c">
                <Avatar team={f} src={f.avatarThumbUrl} size={36} />
              </td>
              <td data-sort-value={f.name}>
                <TeamLink leagueId={leagueId} team={f} size={0} strong />
              </td>
              <td>{f.manager}</td>
              <td>
                <Swatches palette={f.palette} compact />
                <span className="small">{f.palette.names.slice(0, 2).join(', ')}</span>
              </td>
              <td className="nowrap">{seasonSpan(f.firstSeason, f.lastSeason, f.active)}</td>
              <td className="num" data-sort-value={f.titles.length}>
                {f.titles.length ? (
                  <>
                    {f.titles.length} <Trophy />
                  </>
                ) : (
                  0
                )}
              </td>
              <td className="num" data-sort-value={f.regular.winPct}>
                {recordText(f.regular.w, f.regular.l, f.regular.t)} <span className="muted">({winPct(f.regular.w, f.regular.l, f.regular.t)})</span>
              </td>
              <td className="num">{f.legacy.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sortable>
  );
}

export default async function TeamsPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  const active = model.franchises.filter((f) => f.active);
  const former = model.franchises.filter((f) => !f.active);
  const toc: TocItem[] = [
    { id: 'current', label: 'Current teams' },
    ...(former.length ? [{ id: 'former', label: 'Former teams' }] : []),
    { id: 'uniforms', label: 'Uniforms' },
  ];

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="teams" />
      <PageHeading title={`List of ${model.name} teams`} />
      <p className="lede">
        The{' '}
        <Link href={routes.league(leagueId)} prefetch={false}>
          {model.name}
        </Link>{' '}
        has {active.length} current teams
        {former.length ? ` and ${former.length} former ${former.length === 1 ? 'franchise' : 'franchises'}` : ''}. Teams are
        listed in Legacy Score order; colors come from each team’s logo.
      </p>
      <TocMobile toc={toc} />
      <Section id="current" title="Current teams">
        <TeamTable leagueId={leagueId} teams={active} />
      </Section>
      {former.length ? (
        <Section id="former" title="Former teams">
          <p>Franchises whose managers have left the league. Their records stay in the history.</p>
          <TeamTable leagueId={leagueId} teams={former} />
        </Section>
      ) : null}
      <Section id="uniforms" title="Uniforms">
        <p>Home uniforms for every franchise, generated from logo colors.</p>
        <div className="uniforms uniforms--sm">
          {model.franchises.map((f) => (
            <Link key={f.id} href={routes.team(leagueId, f.id)} prefetch={false} style={{ color: 'inherit' }}>
              <Uniform team={f} variant="home" showLabel={false} />
              <span className="small" style={{ display: 'block', textAlign: 'center', maxWidth: 110, margin: '0 auto' }}>
                {f.name}
              </span>
            </Link>
          ))}
        </div>
      </Section>
      <Navbox model={model} />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
