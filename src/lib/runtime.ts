/**
 * Process-wide singletons. Kept on globalThis so they survive hot reloads in
 * development and are shared by every route in a single server process.
 */

export interface Metrics {
  /** Requests actually sent to api.sleeper.app (cache misses only). */
  sleeperRequests: number;
  /** Full player-database downloads (budget: at most one per day). */
  playerDownloads: number;
  /** Calls to the story-writing model (budget: one per team). */
  storyCalls: number;
  /** Logo palettes generated (budget: one per team logo). */
  paletteGenerations: number;
  /** League models built from scratch or refreshed. */
  leagueBuilds: number;
  startedAt: number;
}

interface RuntimeState {
  metrics: Metrics;
  inflight: Map<string, Promise<unknown>>;
}

const g = globalThis as typeof globalThis & { __legacywiki?: RuntimeState };

if (!g.__legacywiki) {
  g.__legacywiki = {
    metrics: {
      sleeperRequests: 0,
      playerDownloads: 0,
      storyCalls: 0,
      paletteGenerations: 0,
      leagueBuilds: 0,
      startedAt: Date.now(),
    },
    inflight: new Map(),
  };
}

export const runtime = g.__legacywiki;
export const metrics = runtime.metrics;

/**
 * Collapses concurrent calls that share a key into one promise, so two visitors
 * opening the same league (or the same team story) never trigger duplicate work.
 */
export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = runtime.inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => runtime.inflight.delete(key));
  runtime.inflight.set(key, p);
  return p;
}

export function isInflight(key: string): boolean {
  return runtime.inflight.has(key);
}

/** Limits how many async tasks run at once (used to stay polite with Sleeper). */
export function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
