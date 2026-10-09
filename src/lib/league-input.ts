/**
 * Turns whatever someone pastes into a Sleeper league ID. Shared by the
 * landing page (instant feedback) and POST /api/league (final check).
 *
 * Accepts: a bare league ID, "League ID: 1180…", a sleeper.com or sleeper.app
 * league link, or "demo". Recognizes invite links and other Sleeper links,
 * which don't contain a league ID, so it can say what to do instead.
 */

export type LeagueInputProblem = 'empty' | 'invite' | 'other-link' | 'unrecognized';
export type LeagueInputResult = { ok: true; id: string } | { ok: false; problem: LeagueInputProblem };

export const LEAGUE_INPUT_MESSAGES: Record<LeagueInputProblem, string> = {
  empty: 'Paste your league ID first.',
  invite:
    'That’s an invite link, which doesn’t include the league ID. In the Sleeper app, open the league, tap the gear icon, open General and tap Copy League ID.',
  'other-link':
    'That link doesn’t point to a league. Paste the league ID instead, or a link that contains /leagues/ followed by a long number.',
  unrecognized: 'That doesn’t look like a league ID. It’s a long number, like 1048123456789012345.',
};

export function parseLeagueInput(raw: string): LeagueInputResult {
  const text = raw.trim();
  if (!text) return { ok: false, problem: 'empty' };
  if (/^demo$/i.test(text)) return { ok: true, id: 'demo' };

  const fromLink = text.match(/leagues?\/(\d{10,25})/i);
  if (fromLink) return { ok: true, id: fromLink[1] };

  if (/sleeper\.(?:com|app)\/i\//i.test(text)) return { ok: false, problem: 'invite' };
  if (/^[a-z]+:\/\//i.test(text) || /sleeper\.(?:com|app)/i.test(text)) return { ok: false, problem: 'other-link' };

  // A bare ID, possibly with a label or stray spaces around it ("League ID: 1180…").
  const runs = text.match(/\d{10,25}/g) ?? [];
  if (runs.length === 1) return { ok: true, id: runs[0] };
  return { ok: false, problem: 'unrecognized' };
}
