import { describe, expect, it } from 'vitest';
import { validateProfile } from './profile';
const ok = { name: 'Elena', birthDate: '1990-04-02', gender: 'Female', checkInTime: '20:30' };
describe('validateProfile', () => {
  it('accepts a complete profile', () => expect(validateProfile(ok, '2026-11-15')).toEqual({}));
  it('requires a name', () => expect(validateProfile({ ...ok, name: '  ' }, '2026-11-15').name).toBeTruthy());
  it('rejects a future birth date', () => expect(validateProfile({ ...ok, birthDate: '2026-11-16' }, '2026-11-15').birthDate).toBeTruthy());
  it('requires gender', () => expect(validateProfile({ ...ok, gender: '' }, '2026-11-15').gender).toBeTruthy());
  it('requires a valid daily check-in time', () => { expect(validateProfile({ ...ok, checkInTime: '' }, '2026-11-15').checkInTime).toBeTruthy(); expect(validateProfile({ ...ok, checkInTime: '25:00' }, '2026-11-15').checkInTime).toBeTruthy(); });
});
