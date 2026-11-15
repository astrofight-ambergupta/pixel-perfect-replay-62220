import { useEffect, useState } from 'react';
import { ACCOUNT_EVENT, MIN_PASSWORD, activeAccountId, changePassword, createAccount, deleteAccount, listAccounts, signIn, signOut, validateNewAccount, verifyPassword, type Account } from '@/lib/accounts';
import { TESTING_FRESH_SESSIONS } from '@/lib/session';
import { Orbit, ArrowRight, LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { genderOptions, initials, saveProfile, validateProfile, type Profile } from '@/lib/profile';
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
    <div className="onboard-field"><Label htmlFor="p-time">What time do you plan to write your daily check-in?</Label><Input id="p-time" type="time" value={time} onChange={e => setTime(e.target.value)} /><span className="onboard-hint">ORBIT will remind you at this time each day.</span>{touched && errors.checkInTime && <small>{errors.checkInTime}</small>}</div>
    <Button type="submit" disabled={!valid} size="lg">{submitLabel} <ArrowRight /></Button>
  </form>;
}

function NewAccountForm({ onCancel }: { onCancel?: (() => void) | undefined }) {
  const [name, setName] = useState(''); const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false); const [busy, setBusy] = useState(false);
  const errors = validateNewAccount(name, pw, confirm, listAccounts()); const valid = Object.keys(errors).length === 0;
  return <form className="onboard-form" noValidate onSubmit={async e => { e.preventDefault(); setTouched(true); if (!valid) return; setBusy(true); const acc = await createAccount(name, pw); signIn(acc.id); }}>
    <div className="onboard-field"><Label htmlFor="a-name">Astronaut name</Label><Input id="a-name" value={name} maxLength={80} autoComplete="username" placeholder="Your full name" onChange={e => setName(e.target.value)} />{touched && errors.name && <small>{errors.name}</small>}</div>
    <div className="onboard-field"><Label htmlFor="a-pw">Password</Label><Input id="a-pw" type="password" value={pw} autoComplete="new-password" onChange={e => setPw(e.target.value)} /><span className="onboard-hint">At least {MIN_PASSWORD} characters.</span>{touched && errors.password && <small>{errors.password}</small>}</div>
    <div className="onboard-field"><Label htmlFor="a-pw2">Confirm password</Label><Input id="a-pw2" type="password" value={confirm} autoComplete="new-password" onChange={e => setConfirm(e.target.value)} />{touched && errors.confirm && <small>{errors.confirm}</small>}</div>
    <Button type="submit" size="lg" disabled={busy}>Create account <ArrowRight /></Button>
    {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Back to accounts</Button>}
  </form>;
}

function SignInForm({ account, onBack }: { account: Account; onBack: () => void }) {
  const [pw, setPw] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="onboard-form" onSubmit={async e => { e.preventDefault(); setBusy(true); if (await verifyPassword(account, pw)) signIn(account.id); else { setError('That password doesn’t match. Please try again.'); setBusy(false); } }}>
    <div className="account-chosen"><span className="avatar">{initials(account.name)}</span><strong>{account.name}</strong></div>
    <div className="onboard-field"><Label htmlFor="s-pw">Password</Label><Input id="s-pw" type="password" autoFocus value={pw} autoComplete="current-password" onChange={e => { setPw(e.target.value); setError(''); }} />{error && <small role="alert">{error}</small>}</div>
    <Button type="submit" size="lg" disabled={!pw || busy}>Sign in <ArrowRight /></Button>
    <Button type="button" variant="ghost" onClick={onBack}>Choose a different account</Button>
  </form>;
}

export function OrbitOnboarding() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { const r = () => { setAccounts(listAccounts()); setActive(activeAccountId()); }; r(); window.addEventListener(ACCOUNT_EVENT, r); return () => window.removeEventListener(ACCOUNT_EVENT, r); }, []);
  const me = accounts.find(a => a.id === active);
  return <div className="onboard-screen"><section className="onboard-card">
    <div className="onboard-brand"><Orbit size={40} strokeWidth={1.4} /><div><strong>ORBIT</strong><span>Understanding the human behind every mission.</span></div></div>
    {TESTING_FRESH_SESSIONS && <p className="onboard-hint" role="note">Testing mode: accounts are kept, but check-ins and voice reflections reset each time the app is opened.</p>}
    {me ? <>
      <h1>Welcome aboard, {me.name.split(' ')[0]}</h1><p>Create your profile. These details stay on this device.</p>
      <ProfileForm initial={{ name: me.name, birthDate: '', gender: '', checkInTime: '', missionStart: '' }} submitLabel="Begin mission" />
    </> : chosen ? <>
      <h1>Confirm it’s you</h1><p>Enter the password for this account.</p>
      <SignInForm account={chosen} onBack={() => setChosen(null)} />
    </> : accounts.length === 0 || creating ? <>
      <h1>Create your astronaut account</h1><p>Your account stays on this device and keeps your check-ins separate from other crew members.</p>
      <NewAccountForm onCancel={accounts.length ? () => setCreating(false) : undefined} />
    </> : <>
      <h1>Who is checking in?</h1><p>Choose your account.</p>
      <div className="account-list">{accounts.map(a => <button type="button" key={a.id} className="account-card" onClick={() => setChosen(a)}><span className="avatar">{initials(a.name)}</span><strong>{a.name}</strong><ArrowRight size={16} /></button>)}</div>
      <Button variant="outline" onClick={() => setCreating(true)}><UserPlus /> Create new account</Button>
    </>}
  </section></div>;
}

export function AccountSection() {
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [msg, setMsg] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  const id = activeAccountId();
  return <section className="privacy-section"><h2>Account</h2><p>Your account and password are stored only on this device (password scrambled, never saved as plain text). This confirms the right person in the prototype but is not mission-grade security.</p>
    <form className="onboard-form mt-5" onSubmit={async e => { e.preventDefault(); if (!id) return; if (next.length < MIN_PASSWORD) { setMsg(`New password needs at least ${MIN_PASSWORD} characters.`); return; } setMsg(await changePassword(id, cur, next) ? 'Password changed.' : 'Current password is incorrect.'); setCur(''); setNext(''); }}>
      <div className="onboard-field"><Label htmlFor="c-cur">Current password</Label><Input id="c-cur" type="password" value={cur} autoComplete="current-password" onChange={e => setCur(e.target.value)} /></div>
      <div className="onboard-field"><Label htmlFor="c-new">New password</Label><Input id="c-new" type="password" value={next} autoComplete="new-password" onChange={e => setNext(e.target.value)} /></div>
      <Button type="submit" variant="outline" disabled={!cur || !next}>Change password</Button>{msg && <p role="status">{msg}</p>}
    </form>
    <div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => signOut()}><LogOut /> Switch account / sign out</Button>
      {!confirmDelete ? <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Delete this account</Button> : <Button variant="destructive" onClick={() => id && deleteAccount(id)}>Confirm: delete account and its data</Button>}</div>
  </section>;
}
