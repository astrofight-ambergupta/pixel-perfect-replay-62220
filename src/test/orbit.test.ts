import { describe, expect, it } from 'vitest';
import { canSaveVoiceNote, missionDayFrom, reviseJournal, type Journal } from '@/lib/orbit';
import { promptCoverage } from '@/lib/ai/coverage';
const demoJournals: Journal[] = [{ id: 'a', date: '2026-11-13', day: 1, createdAt: '2026-11-13T18:30:00Z', updatedAt: '2026-11-13T18:30:00Z', ratings: { Mood: 4 }, reflections: {}, revisions: [] }];
describe('Offline journal revision integrity', () => {
  it('keeps the original submission timestamp when an entry is edited', () => {
    const original = demoJournals[0];
    if (!original) throw new Error('Missing example journal');
    const result = reviseJournal(original, { ...original.ratings, Mood: 2 }, original.reflections, '2026-11-15T10:00:00Z');
    expect(result.createdAt).toBe('2026-11-13T18:30:00Z');
    expect(result.updatedAt).toBe('2026-11-15T10:00:00Z');
  });
  it('preserves previous responses in revision history', () => {
    const original = demoJournals[0];
    if (!original) throw new Error('Missing example journal');
    const result = reviseJournal(original, { ...original.ratings, Mood: 2 }, { ...original.reflections, 'note': 'A later thought' }, '2026-11-15T10:00:00Z');
    expect(result.ratings['Mood']).toBe(2);
    expect(result.revisions[0]?.ratings['Mood']).toBe(4);
    expect(result.revisions[0]?.reflections).not.toHaveProperty('note');
    expect(result.id).toBe(original.id);
  });
});
describe('Mission day', () => {
  it('is negative before launch', () => expect(missionDayFrom('2026-11-27', '2026-11-15')).toBe(-12));
  it('is day 1 on launch day', () => expect(missionDayFrom('2026-11-15', '2026-11-15')).toBe(1));
  it('counts up after launch', () => expect(missionDayFrom('2026-11-01', '2026-11-15')).toBe(15));
});
describe('Voice reflection', () => {
  it('allows only one reflection per day', () => { expect(canSaveVoiceNote([], '2026-11-15')).toBe(true); expect(canSaveVoiceNote([{ date: '2026-11-15T15:00:00' }], '2026-11-15')).toBe(false); expect(canSaveVoiceNote([{ date: '2026-11-14T15:00:00' }], '2026-11-15')).toBe(true); });
  it('tracks which topics have been spoken about', () => { const c = promptCoverage('The crew and I had a call with family. Work pressure was a little stressful.'); expect(c.social).toBe(true); expect(c.stress).toBe(true); expect(c.cognitive).toBe(false); });
});
