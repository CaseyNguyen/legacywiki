import type { SeasonResult } from './model/types';

const nf = (d: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const nf0 = nf(0);
const nf1 = nf(1);
const nf2 = nf(2);

/** Fantasy points: 2 decimals for games and averages, 1 for big totals. */
export function pts(n: number | null | undefined, digits: 0 | 1 | 2 = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return (digits === 0 ? nf0 : digits === 1 ? nf1 : nf2).format(n);
}

export const int = (n: number) => nf0.format(n);

export function recordText(w: number, l: number, t = 0) {
  return t ? `${w}–${l}–${t}` : `${w}–${l}`;
}

/** Win percentage in the sports-reference style: .625 */
export function winPct(w: number, l: number, t = 0) {
  const g = w + l + t;
  if (!g) return '—';
  const v = (w + t / 2) / g;
  if (v >= 1) return '1.000';
  return v.toFixed(3).replace(/^0/, '');
}

export function percent(v: number | null | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function resultText(result: SeasonResult, finish: number | null) {
  switch (result) {
    case 'champion':
      return 'league champion';
    case 'runner-up':
      return 'runner-up';
    case 'third':
      return 'the third-place team';
    case 'playoffs':
      return finish ? `a playoff team (${ordinal(finish)} overall)` : 'a playoff team';
    case 'missed':
      return 'missed the playoffs';
    case 'in-progress':
      return 'in progress';
    default:
      return 'upcoming';
  }
}

export const RESULT_LABEL: Record<SeasonResult, string> = {
  champion: 'Champion',
  'runner-up': 'Runner-up',
  third: 'Third place',
  playoffs: 'Playoffs',
  missed: 'Missed playoffs',
  'in-progress': 'In progress',
  upcoming: 'Upcoming',
};

export function longDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function relativeTime(ms: number, now = Date.now()) {
  const diff = Math.max(0, now - ms);
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function signed(n: number, digits: 0 | 1 | 2 = 1) {
  const s = pts(Math.abs(n), digits);
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

export function seasonSpan(first: string, last: string, active: boolean) {
  if (active) return `${first}–present`;
  return first === last ? first : `${first}–${last}`;
}

/** "Raccoons’" / "Taco Tuesday FC’s" */
export function possessive(name: string) {
  return /s$/i.test(name.trim()) ? `${name}’` : `${name}’s`;
}
