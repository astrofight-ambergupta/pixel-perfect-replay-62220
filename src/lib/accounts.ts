/** Device-only astronaut accounts. Passwords are salted PBKDF2 hashes; this is identity confirmation, not real security. */
export type Account = { id: string; name: string; salt: string; hash: string; createdAt: string };
export const ACCOUNTS_KEY = 'orbit-accounts-v1';
const ACTIVE = 'orbit-active-account';
const VAULT = 'orbit-vault-';
const SHARED = new Set([ACCOUNTS_KEY, 'orbit-ai-provider', 'orbit-session-started']);
const isShared = (k: string) => SHARED.has(k) || k.startsWith('orbit-voice-alias-') || k.startsWith('orbit-imported-');
export const ACCOUNT_EVENT = 'orbit-account-change';
export const MIN_PASSWORD = 8;

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return hex(bits);
}
export function listAccounts(): Account[] { try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch { return []; } }
function writeAccounts(a: Account[]) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); }
export function validateNewAccount(name: string, password: string, confirm: string, existing: Account[]) {
  const e: { name?: string; password?: string; confirm?: string } = {};
  const n = name.trim();
  if (!n) e.name = 'Please enter your name.';
  else if (existing.some(a => a.name.toLowerCase() === n.toLowerCase())) e.name = 'An account with this name already exists on this device.';
  if (password.length < MIN_PASSWORD) e.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (confirm !== password) e.confirm = 'Passwords do not match.';
  return e;
}
export async function createAccount(name: string, password: string): Promise<Account> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const acc: Account = { id: crypto.randomUUID(), name: name.trim(), salt, hash: await hashPassword(password, salt), createdAt: new Date().toISOString() };
  writeAccounts([...listAccounts(), acc]);
  return acc;
}
export async function verifyPassword(acc: Account, password: string) { return (await hashPassword(password, acc.salt)) === acc.hash; }
export async function changePassword(id: string, current: string, next: string) {
  const acc = listAccounts().find(a => a.id === id); if (!acc || !(await verifyPassword(acc, current))) return false;
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(next, salt);
  writeAccounts(listAccounts().map(a => a.id === id ? { ...a, salt, hash } : a)); return true;
}
export function activeAccountId() { try { return sessionStorage.getItem(ACTIVE); } catch { return null; } }
export function voiceDbName() { const id = activeAccountId(); if (!id) return 'orbit-voice-v1'; let alias: string | null = null; try { alias = localStorage.getItem(`orbit-voice-alias-${id}`); } catch {} return `orbit-voice-${alias ?? id}`; }
const liveKeys = () => Object.keys(localStorage).filter(k => k.startsWith('orbit-') && !isShared(k) && !k.startsWith(VAULT));
function readVault(id: string): Record<string, string> { try { return JSON.parse(localStorage.getItem(VAULT + id) || '{}'); } catch { return {}; } }
export function stashActive() {
  const id = activeAccountId(); if (!id) return;
  const data: Record<string, string> = {}; liveKeys().forEach(k => { data[k] = localStorage.getItem(k) ?? ''; });
  localStorage.setItem(VAULT + id, JSON.stringify(data));
}
export function signIn(id: string) {
  stashActive(); liveKeys().forEach(k => localStorage.removeItem(k));
  Object.entries(readVault(id)).forEach(([k, v]) => localStorage.setItem(k, v));
  sessionStorage.setItem(ACTIVE, id);
  window.dispatchEvent(new Event(ACCOUNT_EVENT)); window.dispatchEvent(new Event('orbit-profile-change'));
}
export function signOut() {
  stashActive(); liveKeys().forEach(k => localStorage.removeItem(k)); sessionStorage.removeItem(ACTIVE);
  window.dispatchEvent(new Event(ACCOUNT_EVENT)); window.dispatchEvent(new Event('orbit-profile-change'));
}
export function deleteAccount(id: string) {
  if (activeAccountId() === id) { liveKeys().forEach(k => localStorage.removeItem(k)); sessionStorage.removeItem(ACTIVE); }
  localStorage.removeItem(VAULT + id); writeAccounts(listAccounts().filter(a => a.id !== id));
  try { indexedDB.deleteDatabase(`orbit-voice-${id}`); } catch {}
  window.dispatchEvent(new Event(ACCOUNT_EVENT)); window.dispatchEvent(new Event('orbit-profile-change'));
}
/** Testing reset: keep accounts and each account's profile; drop check-ins, voice, AI memory, reminders. */
export function resetAccountData(keep = ['orbit-profile-v1', 'orbit-consent-v1']) {
  liveKeys().forEach(k => localStorage.removeItem(k));
  Object.keys(localStorage).filter(k => k.startsWith(VAULT)).forEach(k => {
    let v: Record<string, string> = {}; try { v = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
    localStorage.setItem(k, JSON.stringify(Object.fromEntries(Object.entries(v).filter(([key]) => keep.includes(key)))));
  });
  try { localStorage.removeItem(ACTIVE); } catch {}
}
/** One-time move of an old device-only account's data into the signed-in cloud account's vault. */
export async function importLegacyAccount(oldId: string, password: string, cloudUserId: string) {
  const acc = listAccounts().find(a => a.id === oldId);
  if (!acc || !(await verifyPassword(acc, password))) return false;
  const merged = { ...readVault(oldId), ...(activeAccountId() === cloudUserId ? {} : readVault(cloudUserId)) };
  if (activeAccountId() === cloudUserId) { liveKeys().forEach(k => { merged[k] = merged[k] ?? localStorage.getItem(k) ?? ''; }); }
  localStorage.setItem(VAULT + cloudUserId, JSON.stringify(merged));
  sessionStorage.removeItem(ACTIVE); liveKeys().forEach(k => localStorage.removeItem(k));
  try {
    const src = indexedDB.open(`orbit-voice-${oldId}`);
    src.onsuccess = () => { /* audio stays readable under the old store name; copy lazily */ src.result.close(); localStorage.setItem(`orbit-voice-alias-${cloudUserId}`, oldId); };
  } catch {}
  writeAccounts(listAccounts().filter(a => a.id !== oldId));
  localStorage.setItem(`orbit-imported-${oldId}`, cloudUserId);
  signIn(cloudUserId);
  return true;
}
