import { withLeague } from '@/lib/http';
import { compareView } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** ?a=<teamId>&b=<teamId> — side-by-side legacy comparison. */
export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const t0 = performance.now();
  const { leagueId } = await params;
  const url = new URL(req.url);
  const a = url.searchParams.get('a') ?? '';
  const b = url.searchParams.get('b') ?? '';
  return withLeague(leagueId, t0, (model) => {
    const view = a !== b ? compareView(model, a, b) : null;
    if (!view) return null;
    const { a: ta, b: tb, ...rest } = view;
    const slim = (t: typeof ta) => ({ id: t.id, name: t.name, legacy: t.legacy, palette: t.palette, titles: t.titles });
    return { a: slim(ta), b: slim(tb), ...rest };
  });
}
