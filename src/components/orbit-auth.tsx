import { useEffect, useState } from 'react';
import { ArrowRight, Building2, KeyRound, LogOut, Orbit, RefreshCw, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { PENDING_INVITE, cloudSignOut, refreshCloud, type Membership } from '@/lib/cloud';
import { importLegacyAccount, listAccounts, type Account } from '@/lib/accounts';
import { lastSync, pendingSyncRequests, syncNow, SYNC_EVENT } from '@/lib/sync';
import { formatDate } from '@/lib/orbit';

export function BrandMark() {
  return <div className="onboard-brand"><Orbit size={40} strokeWidth={1.4} /><div><strong>AstraCare- Mental Health</strong><span>Understanding the human behind every mission.</span></div></div>;
}

export function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    if (mode === 'up') {
      if (!name.trim()) { setMsg('Please enter your name.'); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } } });
      if (error) setMsg(error.message);
      else if (data.user && !data.user.identities?.length) { setMode('in'); setMsg('An account with this email already exists. Sign in, or use “Forgot password?” to reset it.'); }
      else setMsg(data.session ? '' : 'Check your email (and spam folder) to confirm your account, then sign in.');
    } else if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message.includes('confirm') ? 'Please confirm your email first.' : 'Email or password doesn’t match.');
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setMsg(error ? error.message : 'If that email has an account, a reset link is on its way.');
    }
    setBusy(false);
  }
  return <div className="onboard-screen"><section className="onboard-card">
    <BrandMark />
    <h1>{mode === 'up' ? 'Create your AstraCare account' : mode === 'in' ? 'Sign in' : 'Reset your password'}</h1>
    <p>{mode === 'up' ? 'One account works for astronauts and healthcare professionals.' : mode === 'in' ? 'Welcome back.' : 'We’ll email you a link.'}</p>
    <form className="onboard-form" onSubmit={submit}>
      {mode === 'up' && <div className="onboard-field"><Label htmlFor="u-name">Full name</Label><Input id="u-name" value={name} maxLength={80} autoComplete="name" onChange={e => setName(e.target.value)} /></div>}
      <div className="onboard-field"><Label htmlFor="u-email">Email</Label><Input id="u-email" type="email" required value={email} autoComplete="email" onChange={e => setEmail(e.target.value)} /></div>
      {mode !== 'reset' && <div className="onboard-field"><Label htmlFor="u-pw">Password</Label><Input id="u-pw" type="password" required minLength={8} value={pw} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} onChange={e => setPw(e.target.value)} />{mode === 'up' && <span className="onboard-hint">At least 8 characters.</span>}</div>}
      {msg && <small role="status">{msg}</small>}
      <Button type="submit" size="lg" disabled={busy}>{mode === 'up' ? 'Create account' : mode === 'in' ? 'Sign in' : 'Send reset link'} <ArrowRight /></Button>
      <div className="flex flex-wrap gap-2">
        {mode !== 'in' && <Button type="button" variant="ghost" onClick={() => { setMode('in'); setMsg(''); }}>I already have an account</Button>}
        {mode !== 'up' && <Button type="button" variant="ghost" onClick={() => { setMode('up'); setMsg(''); }}>Create an account</Button>}
        {mode === 'in' && <Button type="button" variant="ghost" onClick={() => { setMode('reset'); setMsg(''); }}>Forgot password?</Button>}
      </div>
    </form>
  </section></div>;
}

export function WorkspaceInit({ name, hasMemberships, onDone }: { name: string; hasMemberships: boolean; onDone?: () => void }) {
  const pending = typeof localStorage !== 'undefined' ? localStorage.getItem(PENDING_INVITE) : null;
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(pending ? 'join' : 'choose');
  const [wsName, setWsName] = useState(''); const [code, setCode] = useState(pending ?? '');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault(); if (!wsName.trim()) return; setBusy(true);
    const { error } = await supabase.rpc('create_workspace', { _name: wsName.trim() });
    setBusy(false); if (error) { setMsg('The workspace could not be created. Check your connection.'); return; }
    localStorage.setItem('astracare-view', 'professional'); refreshCloud(); onDone?.();
  }
  async function join(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.rpc('redeem_invite', { _code: code });
    setBusy(false);
    if (error) { setMsg(error.message.includes('not valid') ? 'This invitation code is not valid or has expired.' : 'Joining failed. Check your connection and try again.'); return; }
    localStorage.removeItem(PENDING_INVITE); localStorage.setItem('astracare-view', 'astronaut'); refreshCloud(); onDone?.();
  }
  return <div className="onboard-screen"><section className="onboard-card">
    <BrandMark />
    {mode === 'choose' && <>
      <h1>Hello{name ? `, ${name.split(' ')[0]}` : ''}</h1><p>How will you use AstraCare?</p>
      <div className="account-list">
        <button type="button" className="account-card" onClick={() => setMode('create')}><span className="avatar"><Stethoscope size={16} /></span><span><strong>Create a workspace</strong><br /><small>For healthcare professionals monitoring a crew.</small></span><ArrowRight size={16} /></button>
        <button type="button" className="account-card" onClick={() => setMode('join')}><span className="avatar"><UserRound size={16} /></span><span><strong>Join a workspace</strong><br /><small>For astronauts with an invitation code.</small></span><ArrowRight size={16} /></button>
      </div>
      <LegacyImport />
      {hasMemberships && onDone && <Button variant="ghost" onClick={onDone}>Back</Button>}
      <Button variant="ghost" onClick={() => void cloudSignOut()}><LogOut /> Sign out</Button>
    </>}
    {mode === 'create' && <><h1>Create a workspace</h1><p>You’ll be the owner and healthcare professional. You can invite astronauts next.</p>
      <form className="onboard-form" onSubmit={create}><div className="onboard-field"><Label htmlFor="ws-name">Workspace name</Label><Input id="ws-name" value={wsName} maxLength={80} placeholder="e.g. Ares Expedition medical team" onChange={e => setWsName(e.target.value)} /></div>
        {msg && <small role="alert">{msg}</small>}
        <Button type="submit" size="lg" disabled={busy || !wsName.trim()}><Building2 /> Create workspace</Button><Button type="button" variant="ghost" onClick={() => setMode('choose')}>Back</Button></form></>}
    {mode === 'join' && <><h1>Join a workspace</h1><p>Enter the invitation code your healthcare team gave you.</p>
      <form className="onboard-form" onSubmit={join}><div className="onboard-field"><Label htmlFor="ws-code">Invitation code</Label><Input id="ws-code" value={code} placeholder="XXXX-XXXX-XXXX" autoComplete="off" onChange={e => setCode(e.target.value.toUpperCase())} /></div>
        {msg && <small role="alert">{msg}</small>}
        <Button type="submit" size="lg" disabled={busy || code.trim().length < 6}><KeyRound /> Join workspace</Button><Button type="button" variant="ghost" onClick={() => { localStorage.removeItem(PENDING_INVITE); setMode('choose'); }}>Back</Button></form></>}
  </section></div>;
}

export function LegacyImport() {
  const [accounts, setAccounts] = useState<Account[]>([]); const [chosen, setChosen] = useState<Account | null>(null);
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  useEffect(() => setAccounts(listAccounts()), []);
  if (!accounts.length) return null;
  return <div className="privacy-section mt-4"><h3>Bring over earlier check-ins</h3><p>This device has data from an older on-device account. Move it into your new account once.</p>
    {!chosen ? <div className="flex flex-wrap gap-2 mt-3">{accounts.map(a => <Button key={a.id} variant="outline" size="sm" onClick={() => setChosen(a)}>{a.name}</Button>)}</div>
      : <form className="onboard-form mt-3" onSubmit={async e => { e.preventDefault(); const { data } = await supabase.auth.getUser(); if (!data.user) return; const ok = await importLegacyAccount(chosen.id, pw, data.user.id); setMsg(ok ? 'Imported. Your earlier check-ins are now in this account.' : 'That password doesn’t match the old account.'); if (ok) { setAccounts(listAccounts()); setChosen(null); } }}>
        <div className="onboard-field"><Label htmlFor="l-pw">Old password for {chosen.name}</Label><Input id="l-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} /></div>
        <Button type="submit" variant="outline" disabled={!pw}>Import data</Button></form>}
    {msg && <p role="status">{msg}</p>}
  </div>;
}

/** Astronaut-side: shares data when the care team requests it (and the device is online), or on demand. */
export function useSyncWatcher(userId: string | null, astroWorkspaces: string[]) {
  const [requested, setRequested] = useState(false);
  const key = astroWorkspaces.join(',');
  useEffect(() => {
    if (!userId || !astroWorkspaces.length) return;
    let alive = true;
    const check = async () => {
      if (!navigator.onLine) return;
      const pending = await pendingSyncRequests(userId).catch(() => []);
      if (!alive || !pending.length) return;
      setRequested(true);
      try { await syncNow(userId, astroWorkspaces); if (alive) setRequested(false); } catch {}
    };
    void check();
    window.addEventListener('online', check);
    const channel = supabase.channel(`sync-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sync_requests', filter: `user_id=eq.${userId}` }, () => void check())
      .subscribe();
    return () => { alive = false; window.removeEventListener('online', check); void supabase.removeChannel(channel); };
  }, [userId, key]);
  return requested;
}

export function SyncSection({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const astro = memberships.filter(m => m.role === 'astronaut');
  const [last, setLast] = useState<string | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { const r = () => setLast(lastSync()); r(); window.addEventListener(SYNC_EVENT, r); return () => window.removeEventListener(SYNC_EVENT, r); }, []);
  return <section className="privacy-section"><h2>Sharing with your care team</h2>
    <p>Your check-ins save on this device first, even offline. They’re shared with {astro.length ? astro.map(m => m.workspace?.name).join(', ') : 'your workspace'} when your care team asks for an update and you’re online, or when you choose to share now. Voice audio stays on this device; only the written transcript is shared.</p>
    <p className="mt-2"><small>{last ? `Last shared ${formatDate(last)} at ${new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not shared yet.'}</small></p>
    <Button variant="outline" className="mt-4" disabled={busy || !astro.length} onClick={async () => { setBusy(true); setMsg(''); try { const n = await syncNow(userId, astro.map(m => m.workspace_id)); setMsg(`Shared ${n} item${n === 1 ? '' : 's'}.`); } catch (e) { setMsg((e as Error).message); } setBusy(false); }}><RefreshCw /> Share now</Button>
    {msg && <p role="status">{msg}</p>}
  </section>;
}

export function CloudAccountSection({ email }: { email: string }) {
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [msg, setMsg] = useState('');
  return <section className="privacy-section"><h2>Account</h2><p>Signed in as {email}. Your account is secured by AstraCare’s servers; what you can see in each workspace is decided there, not on this device.</p>
    <form className="onboard-form mt-5" onSubmit={async e => { e.preventDefault(); if (next.length < 8) { setMsg('New password needs at least 8 characters.'); return; } const { error } = await supabase.auth.updateUser({ password: next, current_password: cur } as never); setMsg(error ? 'Password could not be changed. Check your current password.' : 'Password changed.'); setCur(''); setNext(''); }}>
      <div className="onboard-field"><Label htmlFor="c-cur">Current password</Label><Input id="c-cur" type="password" value={cur} autoComplete="current-password" onChange={e => setCur(e.target.value)} /></div>
      <div className="onboard-field"><Label htmlFor="c-new">New password</Label><Input id="c-new" type="password" value={next} autoComplete="new-password" onChange={e => setNext(e.target.value)} /></div>
      <Button type="submit" variant="outline" disabled={!cur || !next}>Change password</Button>{msg && <p role="status">{msg}</p>}
    </form>
    <LegacyImport />
    <div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => void cloudSignOut()}><LogOut /> Sign out</Button></div>
  </section>;
}
