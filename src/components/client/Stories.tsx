'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { StoryArticleData, LinkTable } from '../WikiText';
import { StoryLede, StorySections, excerpt } from '../WikiText';
import { Avatar } from '../bits';

interface StoryRecord {
  kind: 'full' | 'summary';
  writtenAt: number;
  article: StoryArticleData;
  /** Present when writing the full article failed and can be retried. */
  error?: string;
}

type StoryResponse = { status: 'ready'; story: StoryRecord; canRetry: boolean } | { status: 'pending' } | { status: 'error'; error: string };

const storyUrl = (leagueId: string, teamId: string) =>
  `/api/league/${encodeURIComponent(leagueId)}/stories/${encodeURIComponent(teamId)}`;

/** The team article's prose: shows the stored story or waits for the one-time write-up. */
export function StoryBlock({
  leagueId,
  teamId,
  teamName,
  initial,
  initialCanRetry,
  links,
}: {
  leagueId: string;
  teamId: string;
  teamName: string;
  initial: StoryRecord | null;
  initialCanRetry: boolean;
  links: LinkTable;
}) {
  const [story, setStory] = useState<StoryRecord | null>(initial);
  const [canRetry, setCanRetry] = useState(initialCanRetry);
  const [retrying, setRetrying] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (story) return;
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(storyUrl(leagueId, teamId), { cache: 'no-store' });
        const data = (await res.json()) as StoryResponse;
        if (stopped) return;
        if (data.status === 'ready') {
          setStory(data.story);
          setCanRetry(data.canRetry);
          setRetrying(false);
          return;
        }
      } catch {
        /* keep polling */
      }
      if (stopped) return;
      if (tries++ < 70) timer = setTimeout(poll, 2500);
      else setGaveUp(true);
    };
    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [story, leagueId, teamId]);

  async function retry() {
    setRetrying(true);
    try {
      await fetch(storyUrl(leagueId, teamId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ retry: true }),
      });
    } catch {
      /* the poll below reports the outcome */
    }
    setStory(null);
  }

  if (!story) {
    return (
      <div aria-live="polite" className="lede-block">
        <p className="lede muted">
          <i>{gaveUp ? 'This article is taking longer than usual. Reload the page to check again.' : 'This article is being written…'}</i>
        </p>
        <div aria-hidden="true" style={{ display: 'grid', gap: 8, maxWidth: '46rem', margin: '10px 0 18px' }}>
          {[96, 88, 92, 64].map((w) => (
            <span key={w} style={{ height: 12, width: `${w}%`, background: 'var(--panel-2)', borderRadius: 4, display: 'block' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lede-block">
        <StoryLede article={story.article} links={links} teamName={teamName} />
        {story.error && canRetry ? (
          <p className="small muted" style={{ marginTop: -4 }}>
            The full article couldn’t be written this time.{' '}
            <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={retry} disabled={retrying}>
              {retrying ? 'Trying again…' : 'Try again'}
            </button>
          </p>
        ) : null}
      </div>
      <StorySections article={story.article} links={links} />
    </>
  );
}

export interface FranchiseCardData {
  id: string;
  name: string;
  manager: string;
  href: string;
  abbr: string;
  avatarThumbUrl: string | null;
  palette: { primary: string; onPrimary: string; secondary: string; names: [string, string, string] };
  active: boolean;
  titles: number;
  record: string;
  playoffApps: number;
  legacyRank: number;
  excerpt: string | null;
}

/** Every team at a glance; fills in each team's story lede as it is written. */
export function FranchiseCards({ leagueId, cards, aiEnabled }: { leagueId: string; cards: FranchiseCardData[]; aiEnabled: boolean }) {
  const [excerpts, setExcerpts] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(cards.map((c) => [c.id, c.excerpt])),
  );
  const started = useRef(false);

  useEffect(() => {
    if (!aiEnabled || started.current) return;
    started.current = true;
    const missing = cards.filter((c) => !c.excerpt).map((c) => c.id);
    if (!missing.length) return;
    let stopped = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const queue = [...missing];
    const check = async (id: string, tries: number): Promise<void> => {
      if (stopped) return;
      try {
        const res = await fetch(storyUrl(leagueId, id), { cache: 'no-store' });
        const data = (await res.json()) as StoryResponse;
        if (data.status === 'ready') {
          setExcerpts((prev) => ({ ...prev, [id]: excerpt(data.story.article.lede) }));
          return;
        }
      } catch {
        /* retry below */
      }
      if (tries < 60 && !stopped) {
        await new Promise<void>((resolve) => timers.push(setTimeout(resolve, 3000)));
        return check(id, tries + 1);
      }
    };
    const worker = async () => {
      while (queue.length && !stopped) await check(queue.shift()!, 0);
    };
    void Promise.all([worker(), worker(), worker()]);
    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
  }, [aiEnabled, cards, leagueId]);

  return (
    <div className="cards">
      {cards.map((c) => (
        <article key={c.id} className="card" aria-labelledby={`card-${c.id}`}>
          <div className="card__band" style={{ background: c.palette.primary, color: c.palette.onPrimary, borderBottom: `3px solid ${c.palette.secondary}` }}>
            <Avatar team={{ name: c.name, abbr: c.abbr, avatarThumbUrl: c.avatarThumbUrl, palette: c.palette }} size={40} />
            <div style={{ minWidth: 0 }}>
              <div className="card__name" id={`card-${c.id}`}>
                <Link href={c.href} prefetch={false}>
                  {c.name}
                </Link>
              </div>
              <div className="card__mgr">
                {c.manager}
                {c.active ? '' : ' · former franchise'}
              </div>
            </div>
          </div>
          <div className="card__stats">
            <span>
              Legacy <b>#{c.legacyRank}</b>
            </span>
            <span>
              <b>{c.record}</b>
            </span>
            <span>
              Titles <b>{c.titles}</b>
            </span>
            <span>
              Playoffs <b>{c.playoffApps}</b>
            </span>
          </div>
          <p className="card__text">
            {excerpts[c.id] ? excerpts[c.id] : <span className="pending">{aiEnabled ? 'This team’s article is being written…' : 'No article yet.'}</span>}
          </p>
        </article>
      ))}
    </div>
  );
}
