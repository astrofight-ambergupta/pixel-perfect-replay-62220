import { useState } from 'react';
import { Orbit, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { genderOptions, saveProfile, validateProfile, type Profile } from '@/lib/profile';
import { todayDate } from '@/lib/orbit';
import { requestReminderPermission } from '@/lib/reminders';

export function ProfileForm({ initial, submitLabel, onSaved }: { initial?: Profile | null; submitLabel: string; onSaved?: () => void }) {
  const preset = initial && !genderOptions.includes(initial.gender as never) ? 'Self-describe' : initial?.gender ?? '';
  const [name, setName] = useState(initial?.name ?? '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [choice, setChoice] = useState(preset);
  const [custom, setCustom] = useState(preset === 'Self-describe' ? initial?.gender ?? '' : '');
  const [time, setTime] = useState(initial?.checkInTime ?? '');
  const [touched, setTouched] = useState(false);
  const profile = { name: name.trim(), birthDate, gender: choice === 'Self-describe' ? custom.trim() : choice, checkInTime: time, onboardedAt: initial?.onboardedAt ?? new Date().toISOString() };
  const errors = validateProfile(profile, todayDate());
  const valid = Object.keys(errors).length === 0;
  return <form className="onboard-form" noValidate onSubmit={e => { e.preventDefault(); setTouched(true); if (valid) { saveProfile(profile); void requestReminderPermission(); onSaved?.(); } }}>
    <div className="onboard-field"><Label htmlFor="p-name">Name</Label><Input id="p-name" value={name} maxLength={80} autoComplete="name" placeholder="Your name" onChange={e => setName(e.target.value)} />{touched && errors.name && <small>{errors.name}</small>}</div>
    <div className="onboard-field"><Label htmlFor="p-birth">Birth date</Label><Input id="p-birth" type="date" value={birthDate} max={todayDate()} onChange={e => setBirthDate(e.target.value)} />{touched && errors.birthDate && <small>{errors.birthDate}</small>}</div>
    <fieldset className="onboard-field"><legend>Gender</legend><div className="onboard-chips">{genderOptions.map(g => <button type="button" key={g} aria-pressed={choice === g} className={choice === g ? 'chip-on' : ''} onClick={() => setChoice(g)}>{g}</button>)}</div>
      {choice === 'Self-describe' && <Input aria-label="Describe your gender" value={custom} maxLength={50} placeholder="How do you describe your gender?" onChange={e => setCustom(e.target.value)} />}
      {touched && errors.gender && <small>{errors.gender}</small>}</fieldset>
    <div className="onboard-field"><Label htmlFor="p-time">What time do you plan to write your daily check-in?</Label><Input id="p-time" type="time" value={time} onChange={e => setTime(e.target.value)} /><span className="onboard-hint">ORBIT will remind you at this time each day.</span>{touched && errors.checkInTime && <small>{errors.checkInTime}</small>}</div>
    <Button type="submit" disabled={!valid} size="lg">{submitLabel} <ArrowRight /></Button>
  </form>;
}

export function OrbitOnboarding() {
  return <div className="onboard-screen"><section className="onboard-card">
    <div className="onboard-brand"><Orbit size={40} strokeWidth={1.4} /><div><strong>ORBIT</strong><span>Understanding the human behind every mission.</span></div></div>
    <h1>Welcome aboard</h1><p>Tell us a little about yourself. These details stay on this device.</p>
    <ProfileForm submitLabel="Begin mission" />
  </section></div>;
}
