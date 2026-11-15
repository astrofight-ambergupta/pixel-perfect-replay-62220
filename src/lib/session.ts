import { listAccounts, resetAccountData } from './accounts';
/** Testing mode: every new app launch keeps accounts/profiles but clears check-ins, voice, AI memory and reminders. Set false for real use. */
export const TESTING_FRESH_SESSIONS = true;
const MARK = 'orbit-session-started';
export function resetSessionIfNew() {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(MARK)) return;
    sessionStorage.setItem(MARK, '1');
    if (!TESTING_FRESH_SESSIONS) return;
    resetAccountData();
    try { indexedDB.deleteDatabase('orbit-voice-v1'); listAccounts().forEach(a => indexedDB.deleteDatabase(`orbit-voice-${a.id}`)); } catch {}
  } catch {}
}
