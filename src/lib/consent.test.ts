import { describe, it, expect, beforeEach } from 'vitest';
import { acceptConsent, canAccept, escalationReadiness, loadConsent, needsConsent, withdrawSharing } from './consent';
import { aiAdvicePaused, emptyEscalation, flag, retry } from './ai/escalation';

beforeEach(() => localStorage.clear());
describe('consent', () => {
  it('requires both checkboxes to accept', () => {
    expect(canAccept(true, false)).toBe(false); expect(canAccept(false, true)).toBe(false);
    expect(acceptConsent(true, false)).toBeNull(); expect(acceptConsent(true, true)?.sharingConsent).toBe(true);
  });
  it('records version and both timestamps', () => {
    acceptConsent(true, true, '2026-11-15T10:00:00Z'); const c = loadConsent()!;
    expect(c.termsVersion).toBe('1.0'); expect(c.termsAcceptedAt).toBe('2026-11-15T10:00:00Z'); expect(c.sharingConsentAt).toBe('2026-11-15T10:00:00Z');
  });
  it('asks again when the terms version changes', () => { const c = acceptConsent(true, true)!; expect(needsConsent(c)).toBe(false); expect(needsConsent(c, '2.0')).toBe(true); });
  it('asks again after sharing is withdrawn', () => { acceptConsent(true, true); withdrawSharing(); expect(needsConsent(loadConsent())).toBe(true); });
});
describe('escalation gating', () => {
  it('transmits nothing and keeps AI paused when setup is missing', () => {
    acceptConsent(true, true);
    const r = escalationReadiness(); expect(r.professional).toBe(false); expect(r.service).toBe(false);
    let e = flag(emptyEscalation, 'x', '2026-11-15T00:00:00Z', r);
    expect(e.setupRequired).toBe(true); expect(e.attempts).toBe(0); expect(aiAdvicePaused(e)).toBe(true);
    e = retry(e, '2026-11-15T00:05:00Z', r);
    expect(e.stage).toBe('queued'); expect(aiAdvicePaused(e)).toBe(true);
  });
  it('a failed notification never resumes AI advice', () => {
    const R = { terms: true, sharing: true, professional: true, service: true };
    const e = retry(flag(emptyEscalation, 'x', 't', R), 't2', R); expect(aiAdvicePaused(e)).toBe(true);
  });
});
