/**
 * Escalation workflow. Stages only advance to `confirmed` with a confirmation from a real, connected channel.
 * In this prototype no channel exists, so the workflow stays at `awaiting` and is always labelled simulated.
 */
export type EscalationStage = 'none' | 'flagged' | 'queued' | 'awaiting' | 'confirmed';
export type Escalation = { stage: EscalationStage; simulated: boolean; flaggedAt?: string; reason?: string; attempts: number; lastAttemptAt?: string; falseAlarmReview?: boolean; confirmedBy?: string; log: { at: string; text: string }[] };
export const emptyEscalation: Escalation = { stage: 'none', simulated: true, attempts: 0, log: [] };
const KEY = 'orbit-escalation-v1';
export function loadEscalation(): Escalation { try { return { ...emptyEscalation, ...JSON.parse(localStorage.getItem(KEY) || 'null') }; } catch { return emptyEscalation; } }
export function storeEscalation(e: Escalation) { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch {} window.dispatchEvent(new Event('orbit-escalation')); }
export function flag(e: Escalation, reason: string, now: string): Escalation {
  if (e.stage !== 'none') return e; // never re-flag or drop an open escalation
  return { ...e, stage: 'queued', flaggedAt: now, reason, attempts: 1, lastAttemptAt: now, log: [...e.log, { at: now, text: 'Concern flagged by safety screen' }, { at: now, text: e.simulated ? 'Simulated: notification queued, no message sent to Earth' : 'Notification queued for secure channel' }] };
}
/** Retry delivery; with no real channel the attempt is recorded and the stage moves to awaiting confirmation. */
export function retry(e: Escalation, now: string): Escalation {
  if (e.stage === 'none' || e.stage === 'confirmed') return e;
  return { ...e, stage: 'awaiting', attempts: e.attempts + 1, lastAttemptAt: now, log: [...e.log, { at: now, text: e.simulated ? `Simulated delivery attempt ${e.attempts + 1}: awaiting professional confirmation` : `Delivery attempt ${e.attempts + 1}` }] };
}
export function confirmTakeover(e: Escalation, confirmation: { channel: 'secure-ground-link'; professionalId: string; signature: string } | null, now: string): Escalation {
  if (e.simulated || !confirmation) return e; // a professional is only considered in charge once a real confirmation arrives
  return { ...e, stage: 'confirmed', confirmedBy: confirmation.professionalId, log: [...e.log, { at: now, text: 'Professional confirmed takeover' }] };
}
export function requestFalseAlarmReview(e: Escalation, now: string): Escalation {
  if (e.stage === 'none') return e;
  return { ...e, falseAlarmReview: true, log: [...e.log, { at: now, text: 'Astronaut requested review as a possible false alarm (kept open until a professional reviews)' }] };
}
/** AI stops independent wellbeing advice while any escalation is open. */
export const aiAdvicePaused = (e: Escalation) => e.stage !== 'none';
