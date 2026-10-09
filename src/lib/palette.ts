import 'server-only';
import sharp from 'sharp';
import { store } from './store';
import { dedupe, metrics } from './runtime';
import { demoAvatarSvg } from './sleeper/demo';
import {
  chroma,
  fallbackPalette,
  finishPalette,
  hue,
  labDistance,
  labToHex,
  oklchToHex,
  onColor,
  rgbToOklab,
  type Lab,
  type Palette,
} from './colors';

/**
 * Team color palettes, pulled from each team's Sleeper logo.
 * One generation per logo URL, stored permanently, so every team costs at most
 * one image download and one extraction no matter how many people view it.
 */

const NS = 'palettes';
const RETRY_FALLBACK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

interface Cluster {
  lab: Lab;
  weight: number;
  share: number;
}

async function loadImage(url: string): Promise<Buffer> {
  const demo = url.match(/^\/api\/demo\/avatar\/(\d+)/);
  if (demo) {
    const svg = demoAvatarSvg(Number(demo[1]));
    if (!svg) throw new Error('Unknown demo avatar');
    return Buffer.from(svg);
  }
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Logo request failed (${res.status})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Logo too large');
  return bytes;
}

/** Bins pixels in OKLab, then greedily merges nearby bins into color clusters. */
function clusterPixels(pixels: Lab[]): Cluster[] {
  const bins = new Map<string, { sum: Lab; n: number }>();
  for (const p of pixels) {
    const key = `${Math.round(p[0] / 0.05)}|${Math.round(p[1] / 0.025)}|${Math.round(p[2] / 0.025)}`;
    const bin = bins.get(key);
    if (bin) {
      bin.sum[0] += p[0];
      bin.sum[1] += p[1];
      bin.sum[2] += p[2];
      bin.n++;
    } else bins.set(key, { sum: [p[0], p[1], p[2]], n: 1 });
  }
  const sorted = [...bins.values()]
    .map((b) => ({ lab: [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as Lab, n: b.n }))
    .sort((a, b) => b.n - a.n);

  const clusters: Cluster[] = [];
  for (const bin of sorted) {
    const near = clusters.find((c) => labDistance(c.lab, bin.lab) < 0.085);
    if (near) {
      const total = near.weight + bin.n;
      near.lab = [
        (near.lab[0] * near.weight + bin.lab[0] * bin.n) / total,
        (near.lab[1] * near.weight + bin.lab[1] * bin.n) / total,
        (near.lab[2] * near.weight + bin.lab[2] * bin.n) / total,
      ];
      near.weight = total;
    } else clusters.push({ lab: bin.lab, weight: bin.n, share: 0 });
  }
  const total = pixels.length;
  for (const c of clusters) c.share = c.weight / total;
  return clusters.sort((a, b) => b.weight - a.weight);
}

export async function extractPalette(image: Buffer): Promise<Palette> {
  const { data, info } = await sharp(image, { density: 72 })
    .resize(56, 56, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: Lab[] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 140) continue;
    pixels.push(rgbToOklab([data[i], data[i + 1], data[i + 2]]));
  }
  if (pixels.length < 40) throw new Error('Logo is mostly transparent');

  const clusters = clusterPixels(pixels).filter((c) => c.share >= 0.02);
  const chromatic = (c: Cluster) => chroma(c.lab) >= 0.04;
  const whiteish = (c: Cluster) => c.lab[0] > 0.92 && chroma(c.lab) < 0.035;

  const primary =
    clusters.find((c) => chromatic(c) && c.share >= 0.08) ??
    clusters.find((c) => !whiteish(c) && c.share >= 0.08) ??
    clusters[0];

  const rest = clusters.filter((c) => c !== primary);
  const secondary =
    rest
      .filter((c) => labDistance(c.lab, primary.lab) > 0.14)
      .sort((a, b) => b.share * (chromatic(b) ? 1.4 : 1) - a.share * (chromatic(a) ? 1.4 : 1))[0] ?? null;

  const accent =
    rest
      .filter(
        (c) =>
          c !== secondary &&
          labDistance(c.lab, primary.lab) > 0.12 &&
          (!secondary || labDistance(c.lab, secondary.lab) > 0.12),
      )
      .sort((a, b) => chroma(b.lab) * Math.sqrt(b.share) - chroma(a.lab) * Math.sqrt(a.share))[0] ?? null;

  const primaryHex = labToHex(primary.lab);
  const secondaryHex = secondary
    ? labToHex(secondary.lab)
    : oklchToHex(primary.lab[0] > 0.6 ? primary.lab[0] - 0.35 : primary.lab[0] + 0.35, chroma(primary.lab) * 0.6, hue(primary.lab));
  const accentHex = accent ? labToHex(accent.lab) : onColor(primaryHex);

  return finishPalette(
    [primaryHex, secondaryHex, accentHex],
    clusters.slice(0, 5).map((c) => ({ hex: labToHex(c.lab), share: Math.round(c.share * 1000) / 1000 })),
    'logo',
  );
}

export async function getPalette(url: string | null, seed: string): Promise<Palette> {
  if (!url) return fallbackPalette(seed);
  const hit = await store.get<Palette>(NS, url);
  if (hit && !(hit.value.source === 'fallback' && Date.now() - hit.savedAt > RETRY_FALLBACK_AFTER_MS)) {
    return hit.value;
  }
  return dedupe(`palette:${url}`, async () => {
    metrics.paletteGenerations++;
    let palette: Palette;
    try {
      palette = await extractPalette(await loadImage(url));
    } catch (err) {
      console.warn(`[palette] using fallback for ${url}:`, (err as Error).message);
      palette = fallbackPalette(seed);
    }
    await store.set(NS, url, palette);
    return palette;
  });
}
