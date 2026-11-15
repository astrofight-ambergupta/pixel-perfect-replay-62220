import { describe, expect, it } from 'vitest';
import { buildActionPlans, computeTrends } from '@/lib/ai/insights';
import type { Journal } from '@/lib/orbit';

const day = (i: number) => { const d = new Date('2026-11-15T12:00:00Z'); d.setUTCDate(d.getUTCDate() - i); return d.toISOString().slice(0, 10); };
const j = (i: number, sleep: number, energy: number): Journal => ({ id: `t${i}`, date: day(i), day: 1, createdAt: '', updatedAt: '', ratings: { Sleep: sleep, Energy: energy, Mood: 3 }, reflections: {}, revisions: [] });

describe('companion trends', () => {
  it('detects a declining sleep trend and gives a multi-step sleep plan', () => {
    const entries = Array.from({ length: 28 }, (_, i) => j(i, i < 10 ? 2 : 4, i < 10 ? 2 : 4));
    const r = computeTrends(entries, '2026-11-15');
    expect(r.trends.find(t => t.dimension === 'sleep')!.direction).toBe('declining');
    expect(r.patterns.some(p => p.kind === 'link' && p.text.includes('sleep'))).toBe(true);
    const plans = buildActionPlans(r, ['sleep']);
    expect(plans[0]!.id).toBe('sleep');
    expect(plans[0]!.steps.length).toBeGreaterThanOrEqual(4);
  });
  it('reports unknown with fewer than 5 check-ins', () => {
    const r = computeTrends([j(0, 3, 3), j(1, 3, 3)], '2026-11-15');
    expect(r.trends.every(t => t.direction === 'unknown')).toBe(true);
  });
});
