import { describe, expect, it } from 'vitest';
import { canSaveJournal, type Journal } from '@/lib/orbit';
import { computeBaseline, MAX_BASELINE_DRIFT, MIN_BASELINE_CHECKINS } from '@/lib/ai/baseline';
import { ruleBasedAnalysis } from '@/lib/ai/fallback';
import { confirmTakeover, emptyEscalation, flag, retry, aiAdvicePaused } from '@/lib/ai/escalation';
import { screenText } from '@/lib/ai/risk';
import { msUntilNext } from '@/lib/reminders';

const day = (n: number) => { const d = new Date('2026-10-01T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const mk = (date: string, mood: number, extra: Partial<Journal> = {}): Journal => ({ id: date + (extra.kind ?? ''), date, day: 1, createdAt: `${date}T10:00:00Z`, updatedAt: `${date}T10:00:00Z`, ratings: { Mood: mood, Stress: 2, Sleep: 4, Energy: 4, Concentration: 4, Connection: 4, Isolation: 2, Motivation: 4 }, reflections: {}, revisions: [], ...extra });

describe('daily check-in rule', () => {
  const official = mk('2026-11-15', 4);
  it('blocks a second official check-in on the same day', () => expect(canSaveJournal([official], mk('2026-11-15', 3, { id: 'other' }))).toBe(false));
  it('allows revising the same official check-in', () => expect(canSaveJournal([official], { ...official, ratings: { ...official.ratings, Mood: 2 } })).toBe(true));
  it('allows supplementary notes on the same day', () => expect(canSaveJournal([official], mk('2026-11-15', 0, { id: 's', kind: 'supplementary', note: 'hi' }))).toBe(true));
});
describe('baseline reliability', () => {
  it('is not reliable before 14 check-ins', () => {
    const b = computeBaseline(Array.from({ length: 9 }, (_, i) => mk(day(i), 4)), day(0), day(9));
    expect(MIN_BASELINE_CHECKINS).toBe(14); expect(b.reliable).toBe(false); expect(b.checkIns).toBe(9);
  });
  it('leaves flagged days out of the baseline', () => {
    const rows = Array.from({ length: 15 }, (_, i) => mk(day(i), i === 3 ? 1 : 4));
    const b = computeBaseline(rows, day(0), day(16), [day(3)]);
    expect(b.values.mood).toBe(4); expect(b.excludedDays).toBe(1);
  });
  it('limits how far later low days can move the baseline', () => {
    const rows = [...Array.from({ length: 21 }, (_, i) => mk(day(i), 5)), ...Array.from({ length: 30 }, (_, i) => mk(day(21 + i), 1))];
    const b = computeBaseline(rows, day(0), day(60));
    expect(b.values.mood).toBeGreaterThanOrEqual(5 - MAX_BASELINE_DRIFT - 1e-9);
  });
});
describe('analysis honesty', () => {
  it('reports insufficient data with fewer than 3 recent check-ins', () => {
    const b = computeBaseline([], day(0), day(1));
    const a = ruleBasedAnalysis({ today: '2026-11-15', entries: [mk('2026-11-15', 4)], voice: [], baseline: b, sensors: null });
    expect(a.dimensions.every(d => d.insufficientData && d.confidence === null)).toBe(true);
  });
  it('flags severe language for escalation', () => expect(screenText(['I want to die']).risk).toBe('severe'));
});
describe('escalation', () => {
  it('never confirms a professional takeover in simulation', () => {
    let e = flag(emptyEscalation, 'test', '2026-11-15T00:00:00Z'); e = retry(e, '2026-11-15T00:05:00Z');
    const c = confirmTakeover(e, { channel: 'secure-ground-link', professionalId: 'x', signature: 'y' }, '2026-11-15T00:10:00Z');
    expect(c.stage).toBe('awaiting'); expect(aiAdvicePaused(c)).toBe(true);
  });
});
describe('reminder timing', () => {
  it('fires later today when the time is still ahead', () => expect(msUntilNext('20:30', new Date(2026, 10, 15, 20, 0))).toBe(30 * 60000));
  it('rolls to tomorrow when the time has passed', () => expect(msUntilNext('08:00', new Date(2026, 10, 15, 9, 0))).toBe(23 * 3600000));
});
