import { beforeEach, describe, expect, it } from 'vitest';
import { createAccount, listAccounts, resetAccountData, signIn, signOut, validateNewAccount, verifyPassword } from './accounts';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
describe('device accounts', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const a = await createAccount('Elena Carter', 'correct-horse');
    expect(a.hash).not.toContain('correct-horse');
    expect(await verifyPassword(a, 'correct-horse')).toBe(true);
    expect(await verifyPassword(a, 'wrong-pass')).toBe(false);
  });
  it('requires 8+ character passwords, matching confirmation and unique names', async () => {
    await createAccount('Elena', 'password1');
    const e = validateNewAccount('elena', 'short', 'other', listAccounts());
    expect(e.name).toBeTruthy(); expect(e.password).toBeTruthy(); expect(e.confirm).toBeTruthy();
  });
  it('keeps each account\'s check-ins separate', async () => {
    const a = await createAccount('A', 'password1'); const b = await createAccount('B', 'password1');
    signIn(a.id); localStorage.setItem('orbit-journals-v1', '["a"]'); signOut();
    signIn(b.id); expect(localStorage.getItem('orbit-journals-v1')).toBeNull(); signOut();
    signIn(a.id); expect(localStorage.getItem('orbit-journals-v1')).toBe('["a"]');
  });
  it('testing reset keeps accounts and profiles but clears check-ins', async () => {
    const a = await createAccount('A', 'password1');
    signIn(a.id); localStorage.setItem('orbit-profile-v1', '{"name":"A"}'); localStorage.setItem('orbit-journals-v1', '["x"]'); signOut();
    resetAccountData();
    expect(listAccounts()).toHaveLength(1);
    signIn(a.id);
    expect(localStorage.getItem('orbit-profile-v1')).toBe('{"name":"A"}');
    expect(localStorage.getItem('orbit-journals-v1')).toBeNull();
  });
});
