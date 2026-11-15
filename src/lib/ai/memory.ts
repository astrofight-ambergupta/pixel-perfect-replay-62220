import type { Journal } from '../orbit';
import { isOfficial } from '../orbit';
import { dimensionScores, type Baseline } from './baseline';
import type { Analysis, Dimension } from './types';

/** Long-term memory: one stored analysis per day plus concern tracking, kept on device. */
export type Concern = { dimension: Dimension; since: string; status: 'improving' | 'persisting' | 'worsening' | 'resolved'; lastDelta: number };
export type Memory = { analyses: Analysis[]; concerns: Concern[] };
const KEY = 'orbit-ai-memory-v1';
export function loadMemory(): Memory { try { return { analyses: [], concerns: [], ...JSON.parse(localStorage.getItem(KEY) || 'null') }; } catch { return { analyses: [], concerns: [] }; } }
export function updateConcerns(prev: Concern[], a: Analysis): Concern[] {
  const out: Concern[] = [];
  for (const d of a.dimensions) {
    const old = prev.find(c => c.dimension === d.dimension && c.status !== 'resolved');
    if (d.delta === null) { if (old) out.push(old); continue; }
    if (!old) { if (d.trend === 'lower') out.push({ dimension: d.dimension, since: a.date, status: 'persisting', lastDelta: d.delta }); continue; }
    const status = d.trend !== 'lower' ? 'resolved' : d.delta < old.lastDelta - .15 ? 'worsening' : d.delta > old.lastDelta + .15 ? 'improving' : 'persisting';
    out.push({ ...old, status, lastDelta: d.delta });
  }
  return [...out, ...prev.filter(c => c.status === 'resolved')].slice(0, 30);
}
export function remember(a: Analysis) {
  const m = loadMemory();
  const next: Memory = { analyses: [a, ...m.analyses.filter(x => x.date !== a.date)].slice(0, 400), concerns: updateConcerns(m.concerns, a) };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
/** Days that stand out from the baseline (or carried a safety flag). */
export function significantDays(entries: Journal[], baseline: Baseline, limit = 6) {
  return entries.filter(isOfficial).map(e => { const s = dimensionScores(e); const dev = (Object.entries(s) as [Dimension, number][]).reduce((acc, [d, v]) => acc + Math.abs(v - (baseline.values[d] ?? v)), 0); return { entry: e, deviation: +dev.toFixed(1) }; })
    .filter(x => x.deviation >= 3).sort((a, b) => b.deviation - a.deviation).slice(0, limit);
}
/** Retrieve past entries where the same dimensions were low, to give the AI historical context. */
export function retrieveRelated(entries: Journal[], dims: Dimension[], baseline: Baseline, before: string, limit = 3) {
  if (!dims.length) return [];
  return entries.filter(e => isOfficial(e) && e.date < before && dims.some(d => { const v = dimensionScores(e)[d]; const b = baseline.values[d]; return v !== undefined && b !== undefined && v <= b - 1; })).slice(0, limit);
}
