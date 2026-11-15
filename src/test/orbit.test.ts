import { describe, expect, it } from 'vitest';
import { demoJournals, reviseJournal } from '@/lib/orbit';
describe('Offline journal revision integrity', () => {
  it('keeps the original submission timestamp when an entry is edited', () => {
    const original = demoJournals[0];
    const result = reviseJournal(original, { ...original.ratings, Mood: 2 }, original.reflections, '2026-11-15T10:00:00Z');
    expect(result.createdAt).toBe('2026-11-13T18:30:00Z');
    expect(result.updatedAt).toBe('2026-11-15T10:00:00Z');
  });
  it('preserves previous responses in revision history', () => {
    const original = demoJournals[0];
    const result = reviseJournal(original, { ...original.ratings, Mood: 2 }, { ...original.reflections, 'note': 'A later thought' }, '2026-11-15T10:00:00Z');
    expect(result.ratings.Mood).toBe(2);
    expect(result.revisions[0].ratings.Mood).toBe(4);
    expect(result.revisions[0].reflections).not.toHaveProperty('note');
    expect(result.id).toBe(original.id);
  });
});