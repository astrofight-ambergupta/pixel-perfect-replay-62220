import { BrandMark } from './orbit-auth';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { genderOptions, saveProfile, validateProfile, type Profile } from '@/lib/profile';
import { deviceTimeZone, todayDate } from '@/lib/orbit';
const allZones: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return []; } })();
import { requestReminderPermission } from '@/lib/reminders';

export function ProfileForm({ initial, submitLabel, onSaved }: { initial?: Profile | null; submitLabel: string; onSaved?: () => void }) {
  const preset = initial && !genderOptions.includes(initial.gender as never) ? 'Self-describe' : initial?.gender ?? '';
  const [name, setName] = useState(initial?.name ?? '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [choice, setChoice] = useState(preset);
  const [custom, setCustom] = useState(preset === 'Self-describe' ? initial?.gender ?? '' : '');
  const [time, setTime] = useState(initial?.checkInTime ?? '');
  const [missionStart, setMissionStart] = useState(initial?.missionStart ?? '');
  const [timeZone, setTimeZone] = useState(initial?.timeZone || deviceTimeZone());
  const [touched, setTouched] = useState(false);
  const profile = { name: name.trim(), birthDate, gender: choice === 'Self-describe' ? custom.trim() : choice, checkInTime: time, missionStart, timeZone, onboardedAt: initial?.onboardedAt ?? new Date().toISOString() };
  const errors = validateProfile(profile, todayDate(timeZone));
  const valid = Object.keys(errors).length === 0;
  return <form className="onboard-form" noValidate onSubmit={e => { e.preventDefault(); setTouched(true); if (valid) { saveProfile(profile); void requestReminderPermission(); onSaved?.(); } }}>
    <div className="onboard-field"><Label htmlFor="p-name">Name</Label><Input id="p-name" value={name} maxLength={80} autoComplete="name" placeholder="Your name" onChange={e => setName(e.target.value)} />{touched && errors.name && <small>{errors.name}</small>}</div>
    <div className="onboard-field"><Label htmlFor="p-birth">Birth date</Label><Input id="p-birth" type="date" value={birthDate} max={todayDate()} onChange={e => setBirthDate(e.target.value)} />{touched && errors.birthDate && <small>{errors.birthDate}</small>}</div>
    <fieldset className="onboard-field"><legend>Gender</legend><div className="onboard-chips">{genderOptions.map(g => <button type="button" key={g} aria-pressed={choice === g} className={choice === g ? 'chip-on' : ''} onClick={() => setChoice(g)}>{g}</button>)}</div>
      {choice === 'Self-describe' && <Input aria-label="Describe your gender" value={custom} maxLength={50} placeholder="How do you describe your gender?" onChange={e => setCustom(e.target.value)} />}
      {touched && errors.gender && <small>{errors.gender}</small>}</fieldset>
    <div className="onboard-field"><Label htmlFor="p-mission">When does your mission start?</Label><Input id="p-mission" type="date" value={missionStart} onChange={e => setMissionStart(e.target.value)} /><span className="onboard-hint">Launch day is mission day 1. Days before launch count down (T−).</span>{touched && errors.missionStart && <small>{errors.missionStart}</small>}</div>
    <div className="onboard-field"><Label htmlFor="p-tz">Your time zone</Label><Input id="p-tz" list="tz-list" value={timeZone} onChange={e => setTimeZone(e.target.value)} /><datalist id="tz-list">{allZones.map(z => <option key={z} value={z} />)}</datalist><span className="onboard-hint">Saved on this device so dates and mission days stay correct offline.</span>{touched && errors.timeZone && <small>{errors.timeZone}</small>}</div>
    <div className="onboard-field"><Label htmlFor="p-time">What time do you plan to write your daily check-in?</Label><Input id="p-time" type="time" value={time} onChange={e => setTime(e.target.value)} /><span className="onboard-hint">AstraCare will remind you at this time each day.</span>{touched && errors.checkInTime && <small>{errors.checkInTime}</small>}</div>
    <Button type="submit" disabled={!valid} size="lg">{submitLabel} <ArrowRight /></Button>
  </form>;
}

export function ProfileSetup({ name }: { name: string }) {
  return <div className="onboard-screen"><section className="onboard-card">
    <BrandMark />
    <h1>Welcome aboard{name ? `, ${name.split(' ')[0]}` : ''}</h1><p>Create your astronaut profile. These details stay on this device until your care team asks for an update.</p>
    <ProfileForm initial={{ name, birthDate: '', gender: '', checkInTime: '', missionStart: '' }} submitLabel="Begin mission" />
  </section></div>;
}
