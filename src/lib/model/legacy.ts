import type { Franchise, LegacyLine, LegacyWeight } from './types';

/**
 * Legacy Score: a single number for "how great has this franchise been?"
 * Titles dominate, sustained winning adds up, and finishing last costs you.
 * Tune the weights here; every page and endpoint reads from this table.
 */
export const LEGACY_WEIGHTS: LegacyWeight[] = [
  { key: 'championship', label: 'Championships', weight: 100, note: 'Won the title game' },
  { key: 'runnerUp', label: 'Runner-up finishes', weight: 45, note: 'Lost the title game' },
  { key: 'third', label: 'Third-place finishes', weight: 20, note: 'Won the third-place game' },
  { key: 'playoffApp', label: 'Playoff appearances', weight: 20, note: 'Made the winners bracket' },
  { key: 'playoffWin', label: 'Playoff wins', weight: 10, note: 'Wins on the championship path' },
  { key: 'regularSeasonTitle', label: 'Regular-season titles', weight: 15, note: 'Best regular-season record' },
  { key: 'pointsTitle', label: 'Points-for titles', weight: 10, note: 'Most regular-season points' },
  { key: 'win', label: 'Regular-season wins', weight: 3, note: 'Ties count as half a win' },
  { key: 'lastPlace', label: 'Last-place finishes', weight: -15, note: 'Worst regular-season record' },
];

export function legacyLines(f: Pick<
  Franchise,
  'titles' | 'runnerUps' | 'thirds' | 'playoffApps' | 'playoffs' | 'regularSeasonTitles' | 'pointsTitles' | 'regular' | 'lastPlaces'
>): LegacyLine[] {
  const counts: Record<string, number> = {
    championship: f.titles.length,
    runnerUp: f.runnerUps.length,
    third: f.thirds.length,
    playoffApp: f.playoffApps.length,
    playoffWin: f.playoffs.w,
    regularSeasonTitle: f.regularSeasonTitles.length,
    pointsTitle: f.pointsTitles.length,
    win: f.regular.w + f.regular.t / 2,
    lastPlace: f.lastPlaces.length,
  };
  return LEGACY_WEIGHTS.map((w) => ({
    key: w.key,
    label: w.label,
    count: counts[w.key] ?? 0,
    weight: w.weight,
    points: Math.round((counts[w.key] ?? 0) * w.weight * 10) / 10,
  }));
}

export const legacyTotal = (lines: LegacyLine[]) => Math.round(lines.reduce((s, l) => s + l.points, 0) * 10) / 10;
