/** Testing mode: every new app launch (browser session) starts with a clean device. Set false for real use. */
export const TESTING_FRESH_SESSIONS = true;
const MARK = 'orbit-session-started';
export function resetSessionIfNew() {
  if (!TESTING_FRESH_SESSIONS || typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(MARK)) return;
    Object.keys(localStorage).filter(k => k.startsWith('orbit-') && k !== 'orbit-ai-provider').forEach(k => localStorage.removeItem(k));
    try { indexedDB.deleteDatabase('orbit-voice-v1'); } catch {}
    sessionStorage.setItem(MARK, '1');
  } catch {}
}
