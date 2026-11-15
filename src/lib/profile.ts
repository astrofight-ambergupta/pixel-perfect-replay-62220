import { useEffect, useState } from 'react';

export type Profile = { name: string; birthDate: string; gender: string };
export const genderOptions = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Self-describe'] as const;
const KEY = 'orbit-profile-v1';
const EVENT = 'orbit-profile-change';

export function validateProfile(p: Profile, today: string): Partial<Record<keyof Profile, string>> {
  const e: Partial<Record<keyof Profile, string>> = {};
  if (!p.name.trim()) e.name = 'Please enter your name.';
  else if (p.name.trim().length > 80) e.name = 'Name must be 80 characters or fewer.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) e.birthDate = 'Please enter your birth date.';
  else if (p.birthDate > today) e.birthDate = 'Birth date cannot be in the future.';
  if (!p.gender.trim()) e.gender = 'Please choose an option.';
  return e;
}
export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '··'; }
export function saveProfile(p: Profile | null) {
  if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}
export function useProfile() {
  const [state, setState] = useState<{ ready: boolean; profile: Profile | null }>({ ready: false, profile: null });
  useEffect(() => {
    const read = () => { let profile: Profile | null = null; try { profile = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {} setState({ ready: true, profile }); };
    read(); window.addEventListener(EVENT, read); return () => window.removeEventListener(EVENT, read);
  }, []);
  return state;
}
