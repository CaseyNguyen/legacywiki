import type { Franchise } from '@/lib/model/types';
import { contrastRatio, onColor } from '@/lib/colors';

/**
 * Wikipedia-style uniform plate (helmet, jersey, pants) drawn from the team's
 * logo palette. Home uses the primary color, away is white with primary trim,
 * and the alternate is a secondary-color "color rush" set.
 */

export type UniformVariant = 'home' | 'away' | 'alternate';

const AWAY_WHITE = '#f6f6f3';
const FACEMASK = '#9aa3ad';

function pick(variant: UniformVariant, p: Franchise['palette']) {
  const readable = (fg: string, bg: string, fallback: string) => (contrastRatio(fg, bg) >= 2.2 ? fg : fallback);
  if (variant === 'home') {
    const number = readable(p.secondary, p.primary, p.onPrimary);
    return {
      jersey: p.primary,
      number,
      outline: number === p.secondary ? p.accent : p.secondary,
      stripes: [p.secondary, p.accent],
      collar: p.secondary,
      pants: contrastRatio(p.secondary, '#ffffff') < 1.6 ? p.secondary : AWAY_WHITE,
      pantStripe: p.primary,
    };
  }
  if (variant === 'away') {
    return {
      jersey: AWAY_WHITE,
      number: readable(p.primary, AWAY_WHITE, '#1b1f24'),
      outline: p.secondary,
      stripes: [p.primary, p.secondary],
      collar: p.primary,
      pants: p.primary,
      pantStripe: p.secondary,
    };
  }
  const base = p.secondary;
  return {
    jersey: base,
    number: readable(p.primary, base, onColor(base)),
    outline: p.accent,
    stripes: [p.primary, p.primary],
    collar: p.primary,
    pants: base,
    pantStripe: p.primary,
  };
}

const LABEL: Record<UniformVariant, string> = { home: 'Home', away: 'Away', alternate: 'Alternate' };

export function Uniform({
  team,
  variant,
  showLabel = true,
}: {
  team: Pick<Franchise, 'id' | 'name' | 'abbr' | 'jerseyNumber' | 'avatarUrl' | 'palette'>;
  variant: UniformVariant;
  showLabel?: boolean;
}) {
  const p = team.palette;
  const c = pick(variant, p);
  const clipId = `uh-${team.id.replace(/[^a-zA-Z0-9]/g, '')}-${variant}`;
  const number = String(team.jerseyNumber).padStart(2, '0');
  const line = { stroke: '#000', strokeOpacity: 0.32, strokeWidth: 0.8, strokeLinejoin: 'round' as const };
  const description = `${LABEL[variant]} uniform: ${variant === 'away' ? 'white' : (variant === 'home' ? p.names[0] : p.names[1]).toLowerCase()} jersey with number ${number}`;

  return (
    <figure className="uniform">
      <svg viewBox="0 0 120 200" role="img" aria-label={description}>
        <defs>
          <clipPath id={clipId}>
            <circle cx="57" cy="25" r="10.5" />
          </clipPath>
        </defs>
        {/* helmet */}
        <path d="M24 34 C24 15 40 4 60 4 C80 4 94 15 95 32 L95 38 L80 38 L76 48 L40 48 C30 48 24 42 24 34 Z" fill={p.primary} {...line} />
        <path d="M30 20 C36 9 47 5.6 60 5.6 C73 5.6 84 9.5 90 18" fill="none" stroke={p.secondary} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M86 26 L104 29 L104 50 L80 50 M95 38 L104 38 M86 44 L104 44" fill="none" stroke={FACEMASK} strokeWidth="2.4" strokeLinejoin="round" />
        {team.avatarUrl ? (
          <>
            <circle cx="57" cy="25" r="11.6" fill={p.secondary} />
            <image href={team.avatarUrl} x="46.5" y="14.5" width="21" height="21" clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
          </>
        ) : (
          <text x="57" y="29.5" textAnchor="middle" fontSize="11" fontWeight="700" fill={p.onPrimary} style={{ fontFamily: 'var(--font-score)' }}>
            {team.abbr}
          </text>
        )}
        {/* jersey */}
        <path
          d="M38 58 L22 64 L8 92 L22 100 L32 84 L32 140 L88 140 L88 84 L98 100 L112 92 L98 64 L82 58 C78 66 70 70 60 70 C50 70 42 66 38 58 Z"
          fill={c.jersey}
          {...line}
        />
        <path d="M12.9 82.2 L27.8 90.7 L26.1 93.4 L11.5 85 Z M16.1 75.8 L31.6 84.6 L30.3 86.7 L15 78 Z" fill={c.stripes[0]} />
        <path d="M107.1 82.2 L92.2 90.7 L93.9 93.4 L108.5 85 Z M103.9 75.8 L88.4 84.6 L89.7 86.7 L105 78 Z" fill={c.stripes[1]} />
        <path d="M38 58 C42 66 50 70 60 70 C70 70 78 66 82 58 L77.5 57 C73.5 63 67 66 60 66 C53 66 46.5 63 42.5 57 Z" fill={c.collar} />
        <text
          x="60"
          y="91"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="1"
          fill={c.number}
          style={{ fontFamily: 'var(--font-score)' }}
        >
          {team.abbr}
        </text>
        <text
          x="60"
          y="126"
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill={c.number}
          stroke={c.outline}
          strokeWidth="1.4"
          paintOrder="stroke"
          style={{ fontFamily: 'var(--font-score)' }}
        >
          {number}
        </text>
        {/* pants */}
        <path d="M34 144 L86 144 L90 196 L64 196 L60 168 L56 196 L30 196 Z" fill={c.pants} {...line} />
        <path d="M34 144 L39 144 L35 196 L30 196 Z M81 144 L86 144 L90 196 L85 196 Z" fill={c.pantStripe} />
        <rect x="34" y="144" width="52" height="4" fill="#000" opacity="0.18" />
      </svg>
      {showLabel ? <figcaption>{LABEL[variant]}</figcaption> : null}
    </figure>
  );
}

export function UniformSet({
  team,
  small,
  variants = ['home', 'away', 'alternate'],
}: {
  team: Pick<Franchise, 'id' | 'name' | 'abbr' | 'jerseyNumber' | 'avatarUrl' | 'palette'>;
  small?: boolean;
  variants?: UniformVariant[];
}) {
  return (
    <div className={`uniforms${small ? ' uniforms--sm' : ''}`}>
      {variants.map((v) => (
        <Uniform key={v} team={team} variant={v} />
      ))}
    </div>
  );
}

export function Swatches({ palette, compact }: { palette: Franchise['palette']; compact?: boolean }) {
  const roles: Array<[string, string, string]> = [
    ['Primary', palette.primary, palette.names[0]],
    ['Secondary', palette.secondary, palette.names[1]],
    ['Accent', palette.accent, palette.names[2]],
  ];
  if (compact) {
    return (
      <span className="ib-swatches" aria-hidden="true">
        {roles.map(([role, hex]) => (
          <i key={role} className="swatch" style={{ background: hex }} />
        ))}
      </span>
    );
  }
  return (
    <ul className="swatches">
      {roles.map(([role, hex, name]) => (
        <li key={role}>
          <i className="swatch" style={{ background: hex }} />
          <span>
            {name} <span className="muted tnum">{hex.toUpperCase()}</span>
            <span className="muted"> · {role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
