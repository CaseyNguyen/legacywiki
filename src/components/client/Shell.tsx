'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';

const THEME_KEY = 'legacywiki:theme';
export const LAST_KEY = 'legacywiki:lastLeague';
export const RECENT_KEY = 'legacywiki:recentLeagues';

export interface SavedLeague {
  id: string;
  name: string;
  at: number;
}

export function readSaved(): { last: SavedLeague | null; recent: SavedLeague[] } {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as SavedLeague | null;
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as SavedLeague[];
    return { last: last && typeof last.id === 'string' ? last : null, recent: Array.isArray(recent) ? recent : [] };
  } catch {
    return { last: null, recent: [] };
  }
}

export function forgetLeague(id: string) {
  try {
    const { last, recent } = readSaved();
    if (last?.id === id) localStorage.removeItem(LAST_KEY);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.filter((r) => r.id !== id)));
  } catch {
    /* storage unavailable */
  }
}

/** Remembers the open league so the next visit reopens it. */
export function RememberLeague({ id, name }: { id: string; name: string }) {
  useEffect(() => {
    try {
      const entry: SavedLeague = { id, name, at: Date.now() };
      localStorage.setItem(LAST_KEY, JSON.stringify(entry));
      const { recent } = readSaved();
      const next = [entry, ...recent.filter((r) => r.id !== id)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: nothing to remember */
    }
  }, [id, name]);
  return null;
}

type Theme = 'system' | 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === 'light' || t === 'dark') setTheme(t);
    } catch {
      /* ignore */
    }
  }, []);
  const cycle = () => {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    if (next === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };
  const label = theme === 'system' ? 'Theme: match device' : theme === 'light' ? 'Theme: light' : 'Theme: dark';
  return (
    <button type="button" className="mh-btn mh-icon" onClick={cycle} aria-label={`${label}. Change theme`} title={label}>
      {theme === 'light' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

/** Year picker: "All-time" shows Legacy Score standings; a year opens that season. */
export function SeasonSwitcher({ leagueId, seasons }: { leagueId: string; seasons: string[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const match = pathname.match(/\/season\/(\d{4})/);
  const value = match ? match[1] : 'all';
  return (
    <label style={{ display: 'contents' }}>
      <span className="sr-only">View year</span>
      <select
        id="season-switcher"
        className="mh-select"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v === 'all' ? routes.league(leagueId) : routes.season(leagueId, v));
        }}
      >
        <option value="all">All-time</option>
        {[...seasons].reverse().map((s) => (
          <option key={s} value={s}>
            {s} season
          </option>
        ))}
      </select>
    </label>
  );
}

const NAV = [
  {
    key: 'home',
    label: 'Legacy',
    href: (id: string) => routes.league(id),
    match: (p: string, id: string) => p === routes.league(id),
    icon: <path d="M4 5.5C7 4.4 9.6 4.6 12 6v13c-2.4-1.4-5-1.6-8-.5zM20 5.5C17 4.4 14.4 4.6 12 6v13c2.4-1.4 5-1.6 8-.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  },
  {
    key: 'teams',
    label: 'Teams',
    href: (id: string) => routes.teams(id),
    match: (p: string) => /\/teams?(\/|$)/.test(p),
    icon: <path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  },
  {
    key: 'seasons',
    label: 'Seasons',
    href: (id: string) => routes.seasons(id),
    match: (p: string) => /\/seasons?(\/|$)/.test(p),
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" strokeLinecap="round" />
      </g>
    ),
  },
  {
    key: 'h2h',
    label: 'H2H',
    href: (id: string) => routes.h2h(id),
    match: (p: string) => /\/(h2h|compare)(\/|$)/.test(p),
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M5 5l9 9M14 5l-9 9M10 19l9-9M19 19l-4-4" />
      </g>
    ),
  },
  {
    key: 'trades',
    label: 'Trades',
    href: (id: string) => routes.trades(id),
    match: (p: string) => /\/trades(\/|$)/.test(p),
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h14l-3-3M20 16H6l3 3" />
      </g>
    ),
  },
];

/** Sleeper-style tab bar shown on phones. */
export function BottomNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname() ?? '';
  return (
    <nav className="bottom-nav" aria-label="League">
      {NAV.map((item) => {
        const active = item.match(pathname, leagueId);
        return (
          <Link key={item.key} href={item.href(leagueId)} aria-current={active ? 'page' : undefined} prefetch={false}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
