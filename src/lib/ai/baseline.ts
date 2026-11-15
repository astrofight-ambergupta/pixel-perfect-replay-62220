import type { Journal } from '../orbit';
import { isOfficial } from '../orbit';
import type { Dimension } from './types';

export const BASELINE_DAYS = 21;
export const MIN_BASELINE_CHECKINS = 14;
/** Max amount a dimension's baseline can shift from the pre-mission baseline (on a 1–5 scale). */
export const MAX_BASELINE_DRIFT = 0.3;

/** Higher = better wellbeing on every dimension (stress & isolation inverted). */
export function dimensionScores(e: Journal): Partial<Record<Dimension, number>> {
  const r = e.ratings; const out: Partial<Record<Dimension, number>> = {};
  if (r['Sleep']) out.sleep = r['Sleep']; if (r['Stress']) out.stress = 6 - r['Stress']; if (r['Energy']) out.energy = r['Energy'];
  if (r['Mood']) out.mood = r['Mood']; if (r['Concentration']) out.cognitive = r['Concentration'];
  if (r['Connection'] || r['Isolation']) { const v = [r['Connection'], r['Isolation'] ? 6 - r['Isolation'] : undefined].filter((x): x is number => !!x); out.connection = v.reduce((a, b) => a + b, 0) / v.length; }
  return out;
}
function mean(rows: Partial<Record<Dimension, number>>[]) {
  const out: Partial<Record<Dimension, number>> = {};
  for (const d of ['sleep', 'stress', 'energy', 'mood', 'connection', 'cognitive'] as Dimension[]) { const v = rows.map(r => r[d]).filter((x): x is number => x !== undefined); if (v.length) out[d] = v.reduce((a, b) => a + b, 0) / v.length; }
  return out;
}
export type Baseline = { values: Partial<Record<Dimension, number>>; checkIns: number; daysElapsed: number; reliable: boolean; phase: 'building' | 'established'; excludedDays: number };

/**
 * Baseline from official check-ins in the first 21 days (excluding flagged days). Once established, later
 * non-flagged data may adjust it, but by at most MAX_BASELINE_DRIFT so concerning changes never become "normal".
 */
export function computeBaseline(entries: Journal[], startDate: string, today: string, flaggedDates: string[] = []): Baseline {
  const flagged = new Set(flaggedDates);
  const official = entries.filter(isOfficial).sort((a, b) => a.date.localeCompare(b.date));
  const end = new Date(`${startDate}T12:00:00`); end.setDate(end.getDate() + BASELINE_DAYS);
  const endStr = end.toISOString().slice(0, 10);
  const windowRows = official.filter(e => e.date >= startDate && e.date < endStr);
  const usable = windowRows.filter(e => !flagged.has(e.date));
  const daysElapsed = Math.max(0, Math.min(BASELINE_DAYS, Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) / 86400000) + 1));
  const values = mean(usable.map(dimensionScores));
  const reliable = usable.length >= MIN_BASELINE_CHECKINS;
  const phase = today >= endStr && reliable ? 'established' : 'building';
  if (phase === 'established') {
    const later = mean(official.filter(e => e.date >= endStr && !flagged.has(e.date)).map(dimensionScores));
    for (const [d, v] of Object.entries(later) as [Dimension, number][]) {
      const b = values[d]; if (b === undefined) continue;
      const blended = b * .8 + v * .2; values[d] = Math.max(b - MAX_BASELINE_DRIFT, Math.min(b + MAX_BASELINE_DRIFT, blended));
    }
  }
  return { values, checkIns: usable.length, daysElapsed, reliable, phase, excludedDays: windowRows.length - usable.length };
}
