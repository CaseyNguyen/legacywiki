import Link from 'next/link';
import type { Metadata } from 'next';
import { TradeCard } from '@/components/league';
import { ArticleFrame, Navbox, PageFooter, PageHeading, PageTabs, Section, TocMobile, type TocItem } from '@/components/wiki';
import { getLeagueModel } from '@/lib/league';
import { routes } from '@/lib/routes';
import { teamById, tradesFor } from '@/lib/views';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'List of trades' };

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TradesPage({ params, searchParams }: Props) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const sp = await searchParams;
  const model = await getLeagueModel(leagueId);
  if (!model) return null;
  const season = typeof sp.season === 'string' && model.seasons.some((s) => s.season === sp.season) ? sp.season : undefined;
  const trades = tradesFor(model, { season });
  const seasonsWithTrades = model.seasons.filter((s) => s.trades > 0).map((s) => s.season);
  const best = trades[0];
  const bestWinner = best?.winnerId ? teamById(model, best.winnerId) : null;
  const toc: TocItem[] = [
    { id: 'ranked', label: season ? `${season} trades` : 'Trades by value' },
    { id: 'method', label: 'Method' },
  ];

  return (
    <ArticleFrame toc={toc}>
      <PageTabs leagueId={leagueId} current="trades" />
      <PageHeading title={season ? `List of ${model.name} trades in ${season}` : `List of ${model.name} trades`} />
      <p className="lede">
        This is a list of {season ? `the ${trades.length}` : `all ${trades.length}`} trades made in the{' '}
        <Link href={routes.league(leagueId)} prefetch={false}>
          {model.name}
        </Link>
        {season ? ` during the ${season} season` : ''}, ranked by how lopsided they turned out.
        {best && bestWinner ? (
          <>
            {' '}
            The most one-sided deal sent {best.sides.find((s) => s.franchiseId === bestWinner.id)?.received.map((p) => p.name).join(' and ')} to the{' '}
            {bestWinner.name} in week {best.week} of {best.season}.
          </>
        ) : null}
      </p>
      <p className="small">
        Filter by season:{' '}
        <Link href={routes.trades(leagueId)} prefetch={false} style={!season ? { fontWeight: 700, color: 'var(--ink)' } : undefined}>
          All
        </Link>
        {seasonsWithTrades.map((s) => (
          <span key={s}>
            {' · '}
            <Link href={routes.trades(leagueId, s)} prefetch={false} style={season === s ? { fontWeight: 700, color: 'var(--ink)' } : undefined}>
              {s}
            </Link>
          </span>
        ))}
      </p>
      <TocMobile toc={toc} />

      <Section id="ranked" title={season ? `${season} trades` : 'Trades by value'} meta={`${trades.length} trades`}>
        {trades.length ? (
          trades.map((t, i) => <TradeCard key={t.id} model={model} trade={t} rank={i + 1} />)
        ) : (
          <p className="muted">No trades {season ? `in ${season}` : 'yet'}.</p>
        )}
      </Section>

      <Section id="method" title="Method">
        <p>
          Each side’s value is the fantasy points its new players scored <i>in its starting lineup</i>, from the week of the
          trade until each player left the roster (across seasons for dynasty and keeper leagues). Bench points don’t count.
          Trades are ranked by the gap between the two sides. Draft picks and waiver budget are listed but not valued.
        </p>
      </Section>
      <Navbox model={model} />
      <PageFooter model={model} computeMs={performance.now() - t0} />
    </ArticleFrame>
  );
}
