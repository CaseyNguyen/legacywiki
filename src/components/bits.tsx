import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Franchise } from '@/lib/model/types';
import { routes } from '@/lib/routes';

/* eslint-disable @next/next/no-img-element */

export function BrandMark({ className = 'brand__mark' }: { className?: string }) {
  // An open book whose spine is a football's laces: encyclopedia meets gridiron.
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 7.5c4.2-1.6 8.4-1.3 13 1.2v17c-4.6-2.5-8.8-2.8-13-1.2z" fill="#f1f4f8" />
      <path d="M29 7.5c-4.2-1.6-8.4-1.3-13 1.2v17c4.6-2.5 8.8-2.8 13-1.2z" fill="#c9d3e0" />
      <path d="M16 8.7v17" stroke="#00c9b1" strokeWidth="2" />
      <path d="M14 12h4M14 15.5h4M14 19h4M14 22.5h4" stroke="#00c9b1" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({
  team,
  size = 20,
  src,
  label,
  style,
}: {
  team?: { name: string; abbr: string; avatarThumbUrl: string | null; palette: { primary: string; onPrimary: string } } | null;
  size?: number;
  src?: string | null;
  label?: string;
  style?: CSSProperties;
}) {
  const url = src ?? team?.avatarThumbUrl ?? null;
  const dims = { width: size, height: size };
  if (url) {
    return <img className="avatar" src={url} alt="" {...dims} style={style} loading="lazy" decoding="async" />;
  }
  const bg = team?.palette.primary ?? '#8a93a0';
  const fg = team?.palette.onPrimary ?? '#ffffff';
  const text = (label ?? team?.abbr ?? '?').slice(0, size >= 40 ? 3 : 2);
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ ...dims, background: bg, color: fg, fontSize: Math.max(9, Math.round(size * 0.36)), ...style }}
    >
      {text}
    </span>
  );
}

export function TeamLink({
  leagueId,
  team,
  strong,
  size = 18,
  children,
}: {
  leagueId: string;
  team: Franchise | null | undefined;
  strong?: boolean;
  size?: number;
  children?: ReactNode;
}) {
  if (!team) return <span className="muted">Unknown team</span>;
  return (
    <Link className={`tlink${strong ? ' tlink--strong' : ''}`} href={routes.team(leagueId, team.id)} prefetch={false}>
      {size > 0 ? <Avatar team={team} size={size} /> : null}
      <span className="tlink__name">{children ?? team.name}</span>
    </Link>
  );
}

export function PosPill({ pos }: { pos: string }) {
  const key = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'].includes(pos) ? pos : 'X';
  return <span className={`pos pos--${key}`}>{pos || '—'}</span>;
}

export function Trophy({ title = 'Championship' }: { title?: string }) {
  return (
    <svg className="trophy" width="14" height="14" viewBox="0 0 24 24" role="img" aria-label={title} style={{ verticalAlign: '-2px' }}>
      <path
        fill="currentColor"
        d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z"
      />
    </svg>
  );
}
