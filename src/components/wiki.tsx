import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Franchise, LeagueModel } from '@/lib/model/types';
import { routes } from '@/lib/routes';
import { longDate, relativeTime } from '@/lib/format';
import { TocSpy, SectionFolds } from './client/ArticleEnhancers';

export interface TocItem {
  id: string;
  label: string;
  children?: TocItem[];
}

function TocList({ items }: { items: TocItem[] }) {
  return (
    <ol>
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} data-toc={item.id}>
            {item.label}
          </a>
          {item.children?.length ? <TocList items={item.children} /> : null}
        </li>
      ))}
    </ol>
  );
}

export function ArticleFrame({ toc, children }: { toc: TocItem[]; children: ReactNode }) {
  return (
    <div className="frame">
      <aside className="rail" aria-label="Contents">
        <nav className="toc">
          <div className="toc__title">Contents</div>
          <ol>
            <li className="toc__top">
              <a href="#top" data-toc="top">
                (Top)
              </a>
            </li>
          </ol>
          <TocList items={toc} />
        </nav>
      </aside>
      <main className="main" id="top">
        <article className="article">{children}</article>
      </main>
      <TocSpy />
      <SectionFolds />
    </div>
  );
}

export function TocMobile({ toc }: { toc: TocItem[] }) {
  return (
    <details className="toc-mobile">
      <summary>Contents</summary>
      <TocList items={toc} />
    </details>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview', href: routes.league },
  { key: 'teams', label: 'Teams', href: routes.teams },
  { key: 'seasons', label: 'Seasons', href: routes.seasons },
  { key: 'h2h', label: 'Head-to-head', href: (id: string) => routes.h2h(id) },
  { key: 'compare', label: 'Compare legacies', href: (id: string) => routes.compare(id) },
  { key: 'trades', label: 'Trades', href: (id: string) => routes.trades(id) },
] as const;

export type TabKey = (typeof TABS)[number]['key'] | 'team' | 'season';

export function PageTabs({ leagueId, current }: { leagueId: string; current: TabKey }) {
  return (
    <nav className="page-tabs" aria-label="League sections">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href(leagueId)} aria-current={t.key === current ? 'page' : undefined} prefetch={false}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function PageHeading({ title, tagline = 'From LegacyWiki, the league encyclopedia' }: { title: ReactNode; tagline?: ReactNode }) {
  return (
    <header>
      <h1 className="first-heading">{title}</h1>
      <p className="tagline">{tagline}</p>
    </header>
  );
}

export { Section } from './Section';

export function Hatnote({ children }: { children: ReactNode }) {
  return <div className="hatnote" role="note">{children}</div>;
}

export function Infobox({
  title,
  headerStyle,
  image,
  caption,
  children,
}: {
  title: ReactNode;
  headerStyle?: CSSProperties;
  image?: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <table className="infobox">
      <tbody>
        <tr>
          <th colSpan={2} className="ib-title" style={headerStyle}>
            {title}
          </th>
        </tr>
        {image ? (
          <tr>
            <td colSpan={2} className="ib-image">
              {image}
            </td>
          </tr>
        ) : null}
        {caption ? (
          <tr>
            <td colSpan={2} className="ib-caption">
              {caption}
            </td>
          </tr>
        ) : null}
        {children}
      </tbody>
    </table>
  );
}

export function InfoHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <tr>
      <th colSpan={2} className="ib-header" style={style}>
        {children}
      </th>
    </tr>
  );
}

export function InfoRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  );
}

export function Navbox({ model, team }: { model: LeagueModel; team?: Franchise }) {
  const active = model.franchises.filter((f) => f.active);
  const former = model.franchises.filter((f) => !f.active);
  const titleStyle: CSSProperties = team
    ? { background: team.palette.primary, color: team.palette.onPrimary, borderBottom: `3px solid ${team.palette.secondary}` }
    : { background: 'var(--panel-2)' };
  const groupStyle: CSSProperties | undefined = team
    ? { background: team.palette.secondary, color: team.palette.onSecondary }
    : undefined;
  return (
    <nav className="navbox" aria-label={`${model.name} navigation`}>
      <div className="navbox__title" style={titleStyle}>
        <Link href={routes.league(model.leagueId)} style={{ color: 'inherit' }} prefetch={false}>
          {model.name}
        </Link>
      </div>
      <div className="navbox__row">
        <div className="navbox__group" style={groupStyle}>
          Teams
        </div>
        <div className="navbox__list">
          {active.map((f) => (
            <Link key={f.id} href={routes.team(model.leagueId, f.id)} prefetch={false} style={f.id === team?.id ? { fontWeight: 700, color: 'var(--ink)' } : undefined}>
              {f.name}
            </Link>
          ))}
        </div>
      </div>
      {former.length ? (
        <div className="navbox__row">
          <div className="navbox__group" style={groupStyle}>
            Former
          </div>
          <div className="navbox__list">
            {former.map((f) => (
              <Link key={f.id} href={routes.team(model.leagueId, f.id)} prefetch={false}>
                {f.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className="navbox__row">
        <div className="navbox__group" style={groupStyle}>
          Seasons
        </div>
        <div className="navbox__list">
          {model.seasons.map((s) => (
            <Link key={s.season} href={routes.season(model.leagueId, s.season)} prefetch={false}>
              {s.season}
            </Link>
          ))}
        </div>
      </div>
      <div className="navbox__row">
        <div className="navbox__group" style={groupStyle}>
          Articles
        </div>
        <div className="navbox__list">
          <Link href={routes.league(model.leagueId)} prefetch={false}>
            Legacy standings
          </Link>
          <Link href={routes.seasons(model.leagueId)} prefetch={false}>
            List of seasons
          </Link>
          <Link href={routes.h2h(model.leagueId)} prefetch={false}>
            Head-to-head
          </Link>
          <Link href={routes.compare(model.leagueId)} prefetch={false}>
            Legacy comparison
          </Link>
          <Link href={routes.trades(model.leagueId)} prefetch={false}>
            List of trades
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function Categories({ items }: { items: Array<{ label: string; href: string }> }) {
  return (
    <div className="catlinks">
      <b>Categories: </b>
      {items.map((c) => (
        <Link key={c.label} href={c.href} prefetch={false}>
          {c.label}
        </Link>
      ))}
    </div>
  );
}

/** Internal link targets for [[Wiki links]] in stories: team names (old ones too) and seasons. */
export function linkTable(model: LeagueModel): Record<string, string> {
  const table: Record<string, string> = {};
  for (const f of model.franchises) {
    for (const n of f.nameHistory) table[n.name.toLowerCase()] ??= routes.team(model.leagueId, f.id);
    table[f.name.toLowerCase()] = routes.team(model.leagueId, f.id);
  }
  for (const s of model.seasons) table[s.season] = routes.season(model.leagueId, s.season);
  return table;
}

export function PageFooter({ model, computeMs }: { model: LeagueModel; computeMs: number }) {
  return (
    <footer className="page-footer">
      <span>
        Built from {model.source === 'demo' ? 'fictional sample data' : 'the Sleeper API'} on {longDate(model.builtAt)} (
        {relativeTime(model.builtAt)}).{' '}
        {model.playerDataAt ? `Player data cached ${relativeTime(model.playerDataAt)}; it refreshes at most once a day.` : null}
      </span>
      <span className="tnum">This page was assembled from the cached league in {computeMs.toFixed(1)} ms.</span>
    </footer>
  );
}
