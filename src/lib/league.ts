import 'server-only';
import { after } from 'next/server';
import { store } from './store';
import { dedupe, isInflight } from './runtime';
import { buildLeagueModel, LeagueNotFoundError, type BuildProgress } from './model/build';
import { MODEL_SCHEMA, type LeagueModel } from './model/types';

/**
 * League lifecycle: build once, serve from cache, refresh in the background.
 * Pages and endpoints only ever read the cached model, which keeps them fast;
 * the slow part (talking to Sleeper) happens in a build that runs at most once
 * at a time per league.
 */

const NS = 'models';
const IN_SEASON_TTL_MS = 30 * 60 * 1000;
const OFFSEASON_TTL_MS = 24 * 60 * 60 * 1000;

type BuildState =
  | { status: 'building'; progress: BuildProgress }
  | { status: 'error'; error: string; notFound: boolean; at: number };

const g = globalThis as typeof globalThis & { __legacywikiBuilds?: Map<string, BuildState> };
const builds = (g.__legacywikiBuilds ??= new Map<string, BuildState>());

export async function getLeagueModel(leagueId: string): Promise<LeagueModel | null> {
  const hit = await store.get<LeagueModel>(NS, leagueId);
  if (!hit || hit.value.schema !== MODEL_SCHEMA) return null;
  return hit.value;
}

export function isStale(model: LeagueModel) {
  const current = model.seasons[model.seasons.length - 1];
  const ttl = current && current.state === 'in-progress' ? IN_SEASON_TTL_MS : OFFSEASON_TTL_MS;
  return Date.now() - model.builtAt > ttl;
}

/** Starts a build if one isn't already running. Never throws; errors are recorded. */
export function startBuild(leagueId: string): Promise<LeagueModel | null> {
  const key = `build:${leagueId}`;
  if (!isInflight(key)) {
    builds.set(leagueId, {
      status: 'building',
      progress: { phase: 'history', done: 0, total: 1, message: 'Starting', startedAt: Date.now() },
    });
  }
  return dedupe(key, async () => {
    try {
      const model = await buildLeagueModel(leagueId, (progress) => builds.set(leagueId, { status: 'building', progress }));
      await store.set(NS, leagueId, model);
      builds.delete(leagueId);
      return model;
    } catch (err) {
      const notFound = err instanceof LeagueNotFoundError;
      console.error(`[league] build failed for ${leagueId}:`, (err as Error).message);
      builds.set(leagueId, { status: 'error', error: (err as Error).message, notFound, at: Date.now() });
      return null;
    }
  });
}

/** Returns the cached model and, if it has gone stale, refreshes it in the background. */
export async function getFreshLeagueModel(leagueId: string): Promise<LeagueModel | null> {
  const model = await getLeagueModel(leagueId);
  if (model && isStale(model) && !isInflight(`build:${leagueId}`)) {
    const work = startBuild(leagueId);
    try {
      // Keeps the refresh alive after the response on serverless hosts.
      after(() => work);
    } catch {
      /* called outside a request; the promise still runs on a long-lived server */
    }
  }
  return model;
}

export function buildState(leagueId: string): BuildState | null {
  return builds.get(leagueId) ?? null;
}

export function clearBuildError(leagueId: string) {
  const state = builds.get(leagueId);
  if (state?.status === 'error') builds.delete(leagueId);
}
