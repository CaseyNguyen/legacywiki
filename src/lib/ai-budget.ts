import 'server-only';
import { store } from './store';

/**
 * Spending guard for the Anthropic key.
 *
 * Every story call must reserve a slot first. A slot is refused when a daily
 * call limit, monthly call limit or monthly token limit is reached, or while AI
 * writing is paused (out of credits, key rejected, API overloaded). Refused or
 * failed-before-billing calls give their slot back. Usage is stored per month,
 * so limits survive restarts.
 *
 * Limits come from environment variables; 0 turns a limit off.
 */

const NS = 'ai-usage';

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export const AI_LIMITS = {
  dailyCalls: envNumber('LEGACYWIKI_AI_DAILY_CALL_LIMIT', 50),
  monthlyCalls: envNumber('LEGACYWIKI_AI_MONTHLY_CALL_LIMIT', 300),
  monthlyTokens: envNumber('LEGACYWIKI_AI_MONTHLY_TOKEN_LIMIT', 1_500_000),
};

const TIME_ZONE = process.env.LEGACYWIKI_TIMEZONE || 'America/Los_Angeles';

/** Published prices (USD per million tokens) used only for the cost estimate in /api/health. */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-fable-5-1': { input: 10, output: 50 },
};

interface Usage {
  month: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  days: Record<string, number>;
}

export type Unavailable = 'budget' | 'paused';

interface BudgetRuntime {
  usage: Usage | null;
  reserved: number;
  pausedUntil: number;
  pauseReason: string | null;
}

const g = globalThis as typeof globalThis & { __legacywikiBudget?: BudgetRuntime };
const rt = (g.__legacywikiBudget ??= { usage: null, reserved: 0, pausedUntil: 0, pauseReason: null });

function dateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { month: `${get('year')}-${get('month')}`, day: `${get('year')}-${get('month')}-${get('day')}` };
}

async function load(): Promise<Usage> {
  const { month } = dateParts();
  if (!rt.usage || rt.usage.month !== month) {
    const hit = await store.get<Usage>(NS, month);
    rt.usage = hit?.value ?? { month, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, days: {} };
  }
  return rt.usage;
}

function blockedBy(u: Usage, extra: number): string | null {
  const today = (u.days[dateParts().day] ?? 0) + extra;
  if (AI_LIMITS.dailyCalls && today >= AI_LIMITS.dailyCalls) return 'daily call limit';
  if (AI_LIMITS.monthlyCalls && u.calls + extra >= AI_LIMITS.monthlyCalls) return 'monthly call limit';
  if (AI_LIMITS.monthlyTokens && u.inputTokens + u.outputTokens >= AI_LIMITS.monthlyTokens) return 'monthly token limit';
  return null;
}

/** Whether a new story call could start right now (no side effects). */
export async function aiAvailability(): Promise<{ ok: true } | { ok: false; reason: Unavailable }> {
  if (Date.now() < rt.pausedUntil) return { ok: false, reason: 'paused' };
  const u = await load();
  return blockedBy(u, rt.reserved) ? { ok: false, reason: 'budget' } : { ok: true };
}

/** Claims one call slot. Callers must later commitCall() or releaseCall(). */
export async function reserveCall(): Promise<{ ok: true } | { ok: false; reason: Unavailable }> {
  const status = await aiAvailability();
  if (!status.ok) return status;
  rt.reserved++;
  return { ok: true };
}

/** Gives back a slot for a call that was refused before it could be billed. */
export function releaseCall() {
  rt.reserved = Math.max(0, rt.reserved - 1);
}

/** Records a billed call and its token usage. */
export async function commitCall(model: string, usage: { input_tokens?: number | null; output_tokens?: number | null } | null) {
  releaseCall();
  const u = await load();
  const day = dateParts().day;
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  const price = PRICES[model];
  u.calls++;
  u.days[day] = (u.days[day] ?? 0) + 1;
  u.inputTokens += input;
  u.outputTokens += output;
  if (price) u.costUsd += (input * price.input + output * price.output) / 1_000_000;
  // Keep only the last 40 days of daily counts.
  for (const d of Object.keys(u.days).sort().slice(0, -40)) delete u.days[d];
  await store.set(NS, u.month, u);
}

/** Stops all story calls for a while (out of credits, key rejected, API overloaded). */
export function pauseAi(ms: number, reason: string) {
  rt.pausedUntil = Math.max(rt.pausedUntil, Date.now() + ms);
  rt.pauseReason = reason;
  console.warn(`[ai] story writing paused for ${Math.round(ms / 60000)} min: ${reason}`);
}

export async function budgetReport() {
  const u = await load();
  const today = u.days[dateParts().day] ?? 0;
  const blocked = blockedBy(u, rt.reserved);
  const paused = Date.now() < rt.pausedUntil;
  return {
    available: !blocked && !paused,
    blockedBy: blocked,
    paused: paused ? { until: new Date(rt.pausedUntil).toISOString(), reason: rt.pauseReason } : null,
    timeZone: TIME_ZONE,
    today: { calls: today, limit: AI_LIMITS.dailyCalls || null },
    month: {
      month: u.month,
      calls: u.calls,
      callLimit: AI_LIMITS.monthlyCalls || null,
      tokens: u.inputTokens + u.outputTokens,
      tokenLimit: AI_LIMITS.monthlyTokens || null,
      estimatedCostUsd: Math.round(u.costUsd * 100) / 100,
    },
    inFlight: rt.reserved,
  };
}
