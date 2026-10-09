import { json } from '@/lib/http';
import { metrics } from '@/lib/runtime';
import { aiEnabled } from '@/lib/story';
import { budgetReport } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';

/** Call counters (Sleeper, players, stories, palettes) and AI spending against its limits. */
export async function GET() {
  const t0 = performance.now();
  return json({ ok: true, aiStories: aiEnabled(), aiBudget: await budgetReport(), metrics }, t0);
}
