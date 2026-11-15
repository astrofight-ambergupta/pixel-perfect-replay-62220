import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, LogOut, Bell, Bot, BookOpen, ChevronDown, CircleHelp, LayoutDashboard, Menu, Mic, Orbit, Radio, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrbitOnboarding } from './orbit-onboarding';
import { signOut } from '@/lib/accounts';
import { initials, useProfile } from '@/lib/profile';
import { scheduleDailyReminder } from '@/lib/reminders';
import { isOfficial, todayDate } from '@/lib/orbit';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/journal', label: 'Daily journal', icon: BookOpen },
  { to: '/voice-notes', label: 'Voice reflections', icon: Mic },
  { to: '/companion', label: 'AI companion', icon: Bot },
  { to: '/insights', label: 'AI insights', icon: Sparkles },
  { to: '/sensors', label: 'Physiological monitoring', icon: Activity },
  { to: '/timeline', label: 'Mission timeline', icon: Orbit },
] as const;
export function OrbitShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  useEffect(() => setOpen(false), [path]);
  const { ready, profile } = useProfile();
  useEffect(() => { if (!profile) return; return scheduleDailyReminder(profile, () => { try { return (JSON.parse(localStorage.getItem('orbit-journals-v1') || '[]') as { kind?: 'official' | 'supplementary'; date: string }[]).some(e => isOfficial(e as never) && e.date === todayDate()); } catch { return false; } }); }, [profile?.checkInTime]);
  if (!ready) return <div className="onboard-screen" />;
  if (!profile) return <OrbitOnboarding />;
  const ini = initials(profile.name);
  return <div className="app-layout">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link to="/" className="brand"><Orbit size={34} strokeWidth={1.5} /><span>ORBIT<span className="brand-caption">HUMAN SPACEFLIGHT</span></span></Link>
      <div className="workspace"><div className="mission-symbol"><Orbit size={20}/></div><div><strong>Ares Expedition</strong><span>CREW WELLBEING PROGRAM</span></div><ChevronDown size={14}/></div>
      <p className="nav-label">YOUR SPACE</p>
      <nav>{nav.map(item => <Link key={item.to} to={item.to} className={`nav-item ${item.to === '/' ? path === '/' ? 'active' : '' : path.startsWith(item.to) ? 'active' : ''}`}><item.icon size={19}/>{item.label}{item.to === '/insights' && <span className="nav-count">3</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="baseline-panel"><span className="baseline-icon"><ShieldCheck size={20}/></span><strong>Built around you.</strong><p>Your individual baseline.<br/>Your journey. Your wellbeing.</p><Link to="/insights">Explore your baseline <ArrowUpRight size={14}/></Link></div><Link to="/settings" className={`nav-item ${path === '/settings' ? 'active' : ''}`}><Settings2 size={19}/>Settings & privacy</Link><Button variant="ghost" className="help-button" onClick={() => setHelp(true)}><CircleHelp size={19}/>Support & resources <ArrowUpRight size={14}/></Button><div className="profile"><span className="avatar">{ini}</span><div><strong>{profile.name}</strong><span>Crew member</span></div><Button variant="ghost" size="icon" aria-label="Switch account or sign out" title="Switch account / sign out" onClick={() => signOut()}><LogOut size={15}/></Button></div></div>
    </aside>
    {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)}/>}
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(!open)}><Menu/></Button><span>My workspace</span><span className="breadcrumb-divider">/</span><strong>{path === '/' ? 'Overview' : path.includes('journal') ? 'Daily journal' : path.includes('voice') ? 'Voice reflections' : nav.find(n => n.to === path)?.label || (path === '/settings' ? 'Settings & privacy' : 'Healthcare access')}</strong></div><div className="topbar-right"><span className={`connectivity ${online ? '' : 'offline'}`}><i/>{online ? 'Online' : 'Offline'}<span className="connection-caption"> · {online ? 'Device ready' : 'Saved on device'}</span></span><span className="topbar-divider"/><Button variant="ghost" size="icon" aria-label="Notifications" className="notification-button" onClick={() => setNotifications(!notifications)}><Bell size={19}/><i/></Button><span className="avatar avatar-small">{ini}</span></div></header>
      {notifications && <div className="notification-panel"><strong>Your updates</strong><p>Daily check-in reminder: {profile.checkInTime}.</p><p>Your Glance Report updates as you check in.</p><small>All mission data shown is a prototype.</small></div>}
      <main className="page-content">{children}</main><footer className="app-footer"><span><ShieldCheck size={13}/>Your space to reflect. Private by design.</span><span>ORBIT <span className="footer-dot">·</span> Demonstration mission</span></footer>
    </div>
    {help && <div className="modal-backdrop"><section className="modal-panel"><Button variant="ghost" size="icon" className="modal-close" aria-label="Close support" onClick={() => setHelp(false)}><X/></Button><CircleHelp className="text-primary"/><h2>Mission support</h2><p>For personal support, contact your designated mission medical team through your approved mission communication channel.</p><p>ORBIT is a demonstration, not an emergency service or a replacement for professional care.</p><Button onClick={() => setHelp(false)}>Understood</Button></section></div>}
  </div>;
}