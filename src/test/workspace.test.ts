import { describe, expect, it } from 'vitest';
import { resolveView, type Membership } from '@/lib/cloud';
import { buildRecords } from '@/lib/sync';
import { assessRecords } from '@/lib/pro/analysis';

const m = (role: 'astronaut' | 'professional', id = 'w1'): Membership => ({ workspace_id: id, role, workspace: { id, name: id, owner_id: 'x' } });

describe('view selection', () => {
  it('shows the workspace setup when the user has no workspace', () => expect(resolveView([], null, '/')).toBeNull());
  it('astronaut-only users go to the astronaut view, even on /pro', () => expect(resolveView([m('astronaut')], 'professional', '/pro')).toBe('astronaut'));
  it('professional-only users go to the professional view', () => expect(resolveView([m('professional')], null, '/')).toBe('professional'));
  it('dual-role users get their chosen view', () => {
    expect(resolveView([m('professional', 'w1'), m('astronaut', 'w2')], 'professional', '/')).toBe('professional');
    expect(resolveView([m('professional', 'w1'), m('astronaut', 'w2')], 'astronaut', '/')).toBe('astronaut');
  });
});

describe('sharing', () => {
  it('shares transcripts but never voice audio', () => {
    const r = buildRecords([], [{ id: 'v1', date: '2026-11-15T10:00:00Z', prompt: 'p', duration: 60, transcript: 'hello', covered: ['a'], audio: new Blob(['x']) } as never], null);
    expect(r[0]!.kind).toBe('voice');
    expect(JSON.stringify(r[0]!.payload)).not.toContain('audio');
    expect((r[0]!.payload as { transcript: string }).transcript).toBe('hello');
  });
  it('separates official check-ins from supplementary notes', () => {
    const j = { id: 'a', date: '2026-11-15', day: 1, createdAt: '', updatedAt: '', ratings: {}, reflections: {}, revisions: [] };
    const r = buildRecords([{ ...j }, { ...j, id: 'b', kind: 'supplementary' }], [], { name: 'A' });
    expect(r.map(x => x.kind)).toEqual(['checkin', 'note', 'profile']);
  });
});

describe('professional assessment', () => {
  it('reports high risk from concerning language instead of hiding it', () => {
    const j = { id: 'a', date: '2026-11-15', day: 1, createdAt: '', updatedAt: '', ratings: { Mood: 1 }, reflections: { x: 'I want to end my life' }, revisions: [] };
    const a = assessRecords([{ kind: 'checkin', local_id: 'a', record_date: j.date, payload: j as never, synced_at: '' }], '2026-11-15');
    expect(a.risk).toBe('high');
  });
  it('lists missing data when nothing is shared', () => {
    const a = assessRecords([], '2026-11-15');
    expect(a.risk).toBe('low');
    expect(a.missing[0]).toContain('No check-ins');
  });
});
