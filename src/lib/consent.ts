/** Per-account consent records. Stored as a live orbit-* key, so accounts.ts vaults it with the account (prototype: device-only). */
export const TERMS_VERSION = '1.0';
export const CONSENT_KEY = 'orbit-consent-v1';
export const CONSENT_EVENT = 'orbit-consent-change';
export type Consent = { termsVersion: string; termsAcceptedAt: string; sharingConsent: boolean; sharingConsentAt: string | null; withdrawnAt?: string };

export function loadConsent(): Consent | null { try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch { return null; } }
function store(c: Consent) { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); window.dispatchEvent(new Event(CONSENT_EVENT)); }
export const canAccept = (terms: boolean, sharing: boolean) => terms && sharing;
/** Onboarding requires current terms AND active sharing consent. */
export const needsConsent = (c: Consent | null, version = TERMS_VERSION) => !c || c.termsVersion !== version || !c.sharingConsent;
export function acceptConsent(terms: boolean, sharing: boolean, now = new Date().toISOString()): Consent | null {
  if (!canAccept(terms, sharing)) return null;
  const c: Consent = { termsVersion: TERMS_VERSION, termsAcceptedAt: now, sharingConsent: true, sharingConsentAt: now };
  store(c); return c;
}
export function withdrawSharing(now = new Date().toISOString()) { const c = loadConsent(); if (c) store({ ...c, sharingConsent: false, withdrawnAt: now }); }

/** No professional or notification service is configured in this prototype; never invent one. */
export type Readiness = { terms: boolean; sharing: boolean; professional: boolean; service: boolean };
export function escalationReadiness(c: Consent | null = loadConsent(), professional: string | null = null, serviceConnected = false): Readiness {
  return { terms: !!c && c.termsVersion === TERMS_VERSION, sharing: !!c?.sharingConsent, professional: !!professional, service: serviceConnected };
}
export const isReady = (r: Readiness) => r.terms && r.sharing && r.professional && r.service;
