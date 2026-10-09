import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Two-tier key/value store: an in-memory map in front of JSON files on disk.
 * Reads after the first hit are served from memory (sub-millisecond), and the
 * files let caches survive restarts. Swap this module for Redis/KV if you deploy
 * to a multi-instance serverless host.
 */

export interface Entry<T> {
  value: T;
  savedAt: number;
}

const CACHE_DIR =
  process.env.LEGACYWIKI_CACHE_DIR ||
  (process.env.VERCEL ? path.join(os.tmpdir(), 'legacywiki-cache') : path.join(process.cwd(), '.legacywiki-cache'));

const g = globalThis as typeof globalThis & { __legacywikiStore?: Map<string, Entry<unknown>> };
const memory = (g.__legacywikiStore ??= new Map<string, Entry<unknown>>());

function fileFor(ns: string, key: string) {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
  return path.join(CACHE_DIR, ns, `${safe}.json`);
}

export const store = {
  dir: CACHE_DIR,

  /** Memory-only lookup; never touches disk. Used on hot paths. */
  peek<T>(ns: string, key: string): Entry<T> | null {
    return (memory.get(`${ns}:${key}`) as Entry<T> | undefined) ?? null;
  },

  async get<T>(ns: string, key: string): Promise<Entry<T> | null> {
    const mk = `${ns}:${key}`;
    const hit = memory.get(mk) as Entry<T> | undefined;
    if (hit) return hit;
    try {
      const raw = await fs.readFile(fileFor(ns, key), 'utf8');
      const entry = JSON.parse(raw) as Entry<T>;
      memory.set(mk, entry);
      return entry;
    } catch {
      return null;
    }
  },

  async set<T>(ns: string, key: string, value: T, opts: { memoryOnly?: boolean } = {}): Promise<Entry<T>> {
    const entry: Entry<T> = { value, savedAt: Date.now() };
    memory.set(`${ns}:${key}`, entry);
    if (opts.memoryOnly) return entry;
    const file = fileFor(ns, key);
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(entry));
      await fs.rename(tmp, file);
    } catch (err) {
      // A read-only filesystem should not break the app; memory still works.
      console.warn(`[store] could not persist ${ns}/${key}:`, (err as Error).message);
    }
    return entry;
  },

  async delete(ns: string, key: string): Promise<void> {
    memory.delete(`${ns}:${key}`);
    try {
      await fs.unlink(fileFor(ns, key));
    } catch {
      /* already gone */
    }
  },
};
