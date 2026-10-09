import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Avatar, BrandMark } from '@/components/bits';
import { BuildScreen } from '@/components/client/BuildScreen';
import { BottomNav, RememberLeague, SeasonSwitcher, ThemeToggle } from '@/components/client/Shell';
import { TipLayer } from '@/components/client/ArticleEnhancers';
import { getFreshLeagueModel, getLeagueModel } from '@/lib/league';
import { routes } from '@/lib/routes';

export const dynamic = 'force-dynamic';

type Props = { children: ReactNode; params: Promise<{ leagueId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ leagueId: string }> }): Promise<Metadata> {
  const { leagueId } = await params;
  const model = await getLeagueModel(leagueId);
  return { title: model ? { default: model.name, template: `%s · ${model.name} · LegacyWiki` } : 'Building league' };
}

export default async function LeagueLayout({ children, params }: Props) {
  const { leagueId } = await params;
  const model = await getFreshLeagueModel(leagueId);

  return (
    <>
      <header className="masthead">
        <div className="masthead__inner">
          <Link className="brand" href={model ? routes.league(leagueId) : routes.newLeague()} prefetch={false}>
            <BrandMark />
            LegacyWiki
          </Link>
          {model ? (
            <div className="masthead__league">
              {model.avatarUrl ? <Avatar src={model.avatarUrl} size={22} /> : null}
              <span>{model.name}</span>
            </div>
          ) : null}
          <span className="masthead__spacer" />
          <div className="masthead__tools">
            {model ? <SeasonSwitcher leagueId={leagueId} seasons={model.seasons.map((s) => s.season)} /> : null}
            <ThemeToggle />
            <Link className="mh-btn mh-btn--accent" href={routes.newLeague()} prefetch={false} aria-label="Open a different league">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="mh-hide-sm">New league</span>
            </Link>
          </div>
        </div>
      </header>
      {model?.source === 'demo' ? (
        <div className="demo-banner" role="note">
          <div className="demo-banner__inner">
            <span>
              <b>Demo league:</b> fictional teams, managers and players.
            </span>
            <Link href={routes.newLeague()} prefetch={false}>
              Open your own league →
            </Link>
          </div>
        </div>
      ) : null}
      {model ? children : <BuildScreen leagueId={leagueId} />}
      {model ? <BottomNav leagueId={leagueId} /> : null}
      {model ? <RememberLeague id={leagueId} name={model.name} /> : null}
      <TipLayer />
    </>
  );
}
