/**
 * Color math shared by the palette extractor, uniforms and charts.
 * Works in OKLab/OKLCH so "distance" and "lightness" match how colors look.
 */

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
  /** Primary nudged into a lightness band that reads on light / dark chart surfaces. */
  chartLight: string;
  chartDark: string;
  swatches: Array<{ hex: string; share: number; name: string }>;
  names: [string, string, string];
  source: 'logo' | 'fallback';
}

export type RGB = [number, number, number];
export type Lab = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return c * 255;
};

export function rgbToOklab([r8, g8, b8]: RGB): Lab {
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: Lab): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklabToRgb(lab: Lab): RGB {
  const [r, g, b] = oklabToLinear(lab);
  return [fromLinear(r), fromLinear(g), fromLinear(b)];
}

export const labToHex = (lab: Lab) => rgbToHex(oklabToRgb(lab));
export const hexToLab = (hex: string) => rgbToOklab(hexToRgb(hex));

export function chroma([, a, b]: Lab) {
  return Math.hypot(a, b);
}

export function hue([, a, b]: Lab) {
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

export function labDistance(x: Lab, y: Lab) {
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** OKLCH -> hex, reducing chroma until the color fits in sRGB. */
export function oklchToHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  let lo = 0;
  let hi = C;
  const inGamut = (c: number) => {
    const lin = oklabToLinear([L, c * Math.cos(rad), c * Math.sin(rad)]);
    return lin.every((v) => v >= -0.0005 && v <= 1.0005);
  };
  if (inGamut(C)) return labToHex([L, C * Math.cos(rad), C * Math.sin(rad)]);
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(mid)) lo = mid;
    else hi = mid;
  }
  return labToHex([L, lo * Math.cos(rad), lo * Math.sin(rad)]);
}

export function relativeLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black text, whichever reads better on the given fill. */
export function onColor(fill: string) {
  return contrastRatio(fill, '#ffffff') >= contrastRatio(fill, '#14171c') ? '#ffffff' : '#14171c';
}

/** Moves a color's lightness into [min, max] while keeping its hue and chroma. */
export function withLightnessBand(hex: string, min: number, max: number) {
  const lab = hexToLab(hex);
  const L = Math.max(min, Math.min(max, lab[0]));
  return oklchToHex(L, chroma(lab), hue(lab));
}

export function chartColors(primary: string, fallbackHue = 250) {
  const lab = hexToLab(primary);
  // Near-neutral logos still get a recognisable (if muted) series color.
  const c = Math.max(chroma(lab), 0.035);
  const h = chroma(lab) < 0.02 ? fallbackHue : hue(lab);
  const lightL = Math.max(0.42, Math.min(0.6, lab[0]));
  const darkL = Math.max(0.64, Math.min(0.8, lab[0]));
  return { chartLight: oklchToHex(lightL, c, h), chartDark: oklchToHex(darkL, c, h) };
}

// Sports-flavoured color names for infoboxes ("Team colors: Navy, Gold").
const NAMED: Array<[string, string]> = [
  ['Black', '#111111'], ['Charcoal', '#36454f'], ['Slate', '#5b6770'], ['Gray', '#8a8d8f'], ['Silver', '#c0c4c8'],
  ['White', '#ffffff'], ['Cream', '#f3e5ab'], ['Navy', '#0b2265'], ['Midnight blue', '#141f3c'], ['Royal blue', '#1f4fbf'],
  ['Columbia blue', '#9bd3f0'], ['Powder blue', '#b0d4e8'], ['Sky blue', '#5bb3e6'], ['Steel blue', '#4682b4'],
  ['Teal', '#00767a'], ['Aqua', '#00b5ad'], ['Turquoise', '#40e0d0'], ['Midnight green', '#004953'],
  ['Kelly green', '#3a9b3a'], ['Forest green', '#2e6b30'], ['Hunter green', '#1d5c3a'], ['Lime', '#a4d65e'],
  ['Olive', '#708238'], ['Gold', '#f2b01e'], ['Old gold', '#c7a246'], ['Vegas gold', '#c5b358'], ['Yellow', '#ffd60a'],
  ['Orange', '#fb6a14'], ['Burnt orange', '#c75a12'], ['Crimson', '#a6192e'], ['Scarlet', '#e0211b'], ['Red', '#c8102e'],
  ['Cardinal', '#97233f'], ['Maroon', '#6d1a2a'], ['Burgundy', '#773141'], ['Pink', '#ff4fa3'], ['Magenta', '#c2185b'],
  ['Purple', '#4b2a8a'], ['Lavender', '#b4a7d6'], ['Violet', '#7a3fd1'], ['Brown', '#5b3a22'], ['Tan', '#d2b48c'],
  ['Bronze', '#b87d3b'], ['Copper', '#b4613a'], ['Sand', '#d6c7a1'], ['Coral', '#ff7f60'], ['Mint', '#8fe3b5'],
];
const NAMED_LAB = NAMED.map(([name, hex]) => [name, hexToLab(hex)] as const);

export function colorName(hex: string) {
  const lab = hexToLab(hex);
  let best = NAMED_LAB[0];
  let bestD = Infinity;
  for (const entry of NAMED_LAB) {
    const d = labDistance(lab, entry[1]);
    if (d < bestD) {
      bestD = d;
      best = entry;
    }
  }
  return best[0];
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic palette for teams without a logo. */
export function fallbackPalette(seed: string): Palette {
  const h = hashString(seed) % 360;
  const primary = oklchToHex(0.42, 0.13, h);
  const secondary = oklchToHex(0.86, 0.06, (h + 40) % 360);
  const accent = oklchToHex(0.72, 0.15, (h + 180) % 360);
  return finishPalette([primary, secondary, accent], [
    { hex: primary, share: 0.6 },
    { hex: secondary, share: 0.25 },
    { hex: accent, share: 0.15 },
  ], 'fallback');
}

export function finishPalette(
  [primary, secondary, accent]: [string, string, string],
  swatches: Array<{ hex: string; share: number }>,
  source: Palette['source'],
): Palette {
  return {
    primary,
    secondary,
    accent,
    onPrimary: onColor(primary),
    onSecondary: onColor(secondary),
    onAccent: onColor(accent),
    ...chartColors(primary),
    swatches: swatches.map((s) => ({ ...s, name: colorName(s.hex) })),
    names: [colorName(primary), colorName(secondary), colorName(accent)],
    source,
  };
}
