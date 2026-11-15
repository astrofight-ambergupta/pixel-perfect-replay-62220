import { Link, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, ClipboardCopy, LogOut, Orbit, Plus, RefreshCw, Repeat, Sparkles, Stethoscope, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cloudSignOut, refreshCloud, setView, type Membership } from '@/lib/cloud';
import { getAstronautDetail, getWorkspaceOverview, professionalAiReview } from '@/lib/pro/pro.functions';
import { formatDate, ratingQuestions, reflectionQuestions, type Journal } from '@/lib/orbit';
import { WorkspaceInit } from './orbit-auth';

const riskClass = { low: 'risk-low', moderate: 'risk-moderate', high: 'risk-high' } as const;
export function RiskBadge({ risk }: { risk: 'low' | 'moderate' | 'high' }) { return <span className={`risk-badge ${riskClass[risk]}`}>{risk === 'high' ? 'High' : risk === 'moderate' ? 'Moderate' : 'Low'} risk</span>; }

export function ProShell({ memberships, name, hasAstronaut, children }: { memberships: Membership[]; name: string; hasAstronaut: boolean; children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const pro = memberships.filter(m => m.role === 'professional');
  const [adding, setAdding] = useState(false);
  if (adding) return <WorkspaceInit name={name} hasMemberships onDone={() => setAdding(false)} />;
  return <div className="pro-layout">
    <aside className="pro-sidebar">
      <Link to="/pro" className="brand"><Orbit size={30} strokeWidth={1.5} /><span>AstraCare<span className="brand-caption">PROFESSIONAL</span></span></Link>
      <p className="nav-label">YOUR WORKSPACES</p>
      <nav>{pro.map(m => <Link key={m.workspace_id} to="/pro/$workspaceId" params={{ workspaceId: m.workspace_id }} className={`nav-item ${path.includes(m.workspace_id) ? 'active' : ''}`}><Building2 size={17} />{m.workspace?.name ?? 'Workspace'}</Link>)}</nav>
      <Button variant="ghost" className="help-button" onClick={() => setAdding(true)}><Plus size={17} />New or join workspace</Button>
      <div className="sidebar-bottom">
        {hasAstronaut && <Button variant="outline" onClick={() => { setView('astronaut'); window.location.assign('/'); }}><Repeat size={16} />Switch to astronaut view</Button>}
        <div className="profile"><span className="avatar"><Stethoscope size={15} /></span><div><strong>{name || 'Professional'}</strong><span>Healthcare professional</span></div><Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void cloudSignOut()}><LogOut size={15} /></Button></div>
      </div>
    </aside>
    <main className="pro-main">{children}</main>
  </div>;
}

export function ProHome({ memberships }: { memberships: Membership[] }) {
  const pro = memberships.filter(m => m.role === 'professional');
  return <><div className="page-heading"><div><div className="eyebrow">HEALTHCARE PROFESSIONAL VIEW</div><h1>Your workspaces</h1><p>Only workspaces where you hold professional access appear here.</p></div></div>
    {!pro.length ? <p>You don’t have professional access to any workspace yet.</p> :
      <div className="pro-grid">{pro.map(m => <Link key={m.workspace_id} to="/pro/$workspaceId" params={{ workspaceId: m.workspace_id }} className="pro-card"><Building2 /><strong>{m.workspace?.name}</strong><span>Open overview →</span></Link>)}</div>}</>;
}

type SortKey = 'risk' | 'name' | 'lastCheckIn' | 'delta';
export function ProWorkspace({ workspaceId }: { workspaceId: string }) {
  const fetchOverview = useServerFn(getWorkspaceOverview);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['pro-ws', workspaceId], queryFn: () => fetchOverview({ data: { workspaceId } }) });
  const [filter, setFilter] = useState<'all' | 'low' | 'moderate' | 'high'>('all'); const [search, setSearch] = useState(''); const [sort, setSort] = useState<SortKey>('risk');
  const [code, setCode] = useState(''); const [msg, setMsg] = useState('');
  const rank = { high: 0, moderate: 1, low: 2 };
  const list = useMemo(() => (q.data?.astronauts ?? []).filter(a => (filter === 'all' || a.risk === filter) && a.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'risk' ? rank[a.risk] - rank[b.risk] : sort === 'name' ? a.name.localeCompare(b.name) : sort === 'delta' ? a.biggestDelta - b.biggestDelta : (b.lastCheckIn ?? '').localeCompare(a.lastCheckIn ?? '')), [q.data, filter, search, sort]);
  if (q.isLoading) return <p>Loading workspace…</p>;
  if (q.error || !q.data) return <div className="healthcare-gate"><h1>Access unavailable</h1><p>You don’t have professional access to this workspace, or you’re offline.</p><Button asChild><Link to="/pro"><ArrowLeft />Your workspaces</Link></Button></div>;
  const d = q.data; const counts = { low: 0, moderate: 0, high: 0 }; d.astronauts.forEach(a => counts[a.risk]++);
  const reload = () => { void qc.invalidateQueries({ queryKey: ['pro-ws', workspaceId] }); };
  const requestSync = async (uid?: string) => {
    const targets = uid ? [uid] : d.astronauts.map(a => a.userId);
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { error } = await supabase.from('sync_requests').insert(targets.map(t => ({ workspace_id: workspaceId, user_id: t, requested_by: u.user!.id })));
    setMsg(error ? 'Could not send the request.' : `Update requested from ${targets.length} astronaut${targets.length === 1 ? '' : 's'}. Data arrives when their device is online.`); reload();
  };
  const openAlerts = d.alerts.filter(a => a.status === 'open');
  const nameOf = (uid: string | null) => d.astronauts.find(a => a.userId === uid)?.name ?? d.members.find(m => m.user_id === uid)?.display_name ?? 'Member';
  return <>
    <div className="page-heading"><div><div className="eyebrow">WORKSPACE OVERVIEW</div><h1>{d.workspace?.name}</h1><p>Full available data for astronauts in this workspace. Every view is logged.</p></div><Button variant="outline" onClick={() => void requestSync()} disabled={!d.astronauts.length}><RefreshCw />Request update from all</Button></div>
    {msg && <p role="status" className="mb-4">{msg}</p>}
    <div className="pro-stats"><div><span>Astronauts</span><strong>{d.astronauts.length}</strong></div><div className="risk-low"><span>Low risk</span><strong>{counts.low}</strong></div><div className="risk-moderate"><span>Moderate risk</span><strong>{counts.moderate}</strong></div><div className="risk-high"><span>High risk</span><strong>{counts.high}</strong></div><div><span>Open alerts</span><strong>{openAlerts.length}</strong></div></div>
    {openAlerts.length > 0 && <section className="pro-panel pro-alerts"><h2><AlertTriangle size={18} />Alerts needing review</h2>{openAlerts.map(a => <div key={a.id} className="pro-row"><span><strong>{nameOf(a.user_id)}</strong> · {a.level} · {a.reason}</span><span>{formatDate(a.created_at)}</span><Button size="sm" variant="outline" onClick={async () => { const { data: u } = await supabase.auth.getUser(); await supabase.from('alerts').update({ status: 'reviewed', reviewed_by: u.user?.id ?? null }).eq('id', a.id); reload(); }}>Mark reviewed</Button></div>)}</section>}
    <section className="pro-panel"><h2><Users size={18} />Astronauts</h2>
      <div className="pro-filters"><Input placeholder="Search by name" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} aria-label="Filter by risk"><option value="all">All risk levels</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option></select>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort"><option value="risk">Sort: risk</option><option value="lastCheckIn">Sort: last check-in</option><option value="delta">Sort: largest drop from baseline</option><option value="name">Sort: name</option></select></div>
      <table className="pro-table"><thead><tr><th>Astronaut</th><th>Risk</th><th>Last check-in</th><th>Check-ins</th><th>Largest drop</th><th>Last shared</th><th></th></tr></thead><tbody>
        {list.map(a => <tr key={a.userId}><td><Link to="/pro/$workspaceId/$userId" params={{ workspaceId, userId: a.userId }}><strong>{a.name}</strong></Link>{a.openAlerts > 0 && <span className="risk-badge risk-high ml-2">{a.openAlerts} alert</span>}</td><td><RiskBadge risk={a.risk} /></td><td>{a.lastCheckIn ? formatDate(a.lastCheckIn) : '—'}</td><td>{a.checkIns}</td><td>{a.biggestDelta < 0 ? a.biggestDelta.toFixed(2) : '—'}</td><td>{a.lastSynced ? formatDate(a.lastSynced) : 'Never'}{a.pendingSync && <small> · requested</small>}</td><td><Button size="sm" variant="ghost" onClick={() => void requestSync(a.userId)}><RefreshCw size={14} />Request update</Button></td></tr>)}
        {!list.length && <tr><td colSpan={7}>No astronauts yet. Create an invitation below.</td></tr>}
      </tbody></table></section>
    {d.isOwner && <section className="pro-panel"><h2><Plus size={18} />Invitations & members</h2>
      <div className="flex flex-wrap gap-2"><Button onClick={async () => { const { data: c, error } = await supabase.rpc('create_invite', { _ws: workspaceId, _role: 'astronaut' }); if (!error && c) { setCode(c); reload(); } }}>Invite astronaut</Button><Button variant="outline" onClick={async () => { const { data: c, error } = await supabase.rpc('create_invite', { _ws: workspaceId, _role: 'professional' }); if (!error && c) { setCode(c); reload(); } }}>Invite another professional</Button></div>
      {code && <div className="invite-box"><p>Share this code once. It is shown only now and expires in 14 days.</p><strong>{code}</strong><span>{`${window.location.origin}/join/${code}`}</span><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)}><ClipboardCopy size={14} />Copy link</Button></div>}
      <h3 className="mt-5">Active invitations</h3>{d.invites.filter(i => !i.revoked).map(i => <div key={i.id} className="pro-row"><span>…{i.code_hint} · {i.role} · used {i.uses}×</span><span>expires {formatDate(i.expires_at)}</span><Button size="sm" variant="ghost" onClick={async () => { await supabase.from('workspace_invites').update({ revoked: true }).eq('id', i.id); reload(); }}>Revoke</Button></div>)}
      <h3 className="mt-5">Members</h3>{d.members.map(m => <div key={m.user_id + m.role} className="pro-row"><span><strong>{nameOf(m.user_id)}</strong> · {m.role}{m.user_id === d.workspace?.owner_id ? ' (owner)' : ''}</span><span>joined {formatDate(m.joined_at)}</span>{m.user_id !== d.workspace?.owner_id && <Button size="sm" variant="ghost" onClick={async () => { if (!confirm('Remove this member from the workspace?')) return; await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', m.user_id).eq('role', m.role); reload(); refreshCloud(); }}><Trash2 size={14} />Remove</Button>}</div>)}
      <WorkspaceSettings id={workspaceId} name={d.workspace?.name ?? ''} onSaved={() => { reload(); refreshCloud(); }} />
    </section>}
    <section className="pro-panel"><h2>Recent activity</h2>{d.log.slice(0, 15).map((l, i) => <div key={i} className="pro-row"><span>{nameOf(l.actor_id)} {l.action}{l.subject_user_id ? ` (${nameOf(l.subject_user_id)})` : ''}</span><span>{new Date(l.created_at).toLocaleString()}</span></div>)}</section>
  </>;
}
function WorkspaceSettings({ id, name, onSaved }: { id: string; name: string; onSaved: () => void }) {
  const [n, setN] = useState(name);
  return <form className="mt-5 flex flex-wrap gap-2 items-end" onSubmit={async e => { e.preventDefault(); if (!n.trim()) return; await supabase.from('workspaces').update({ name: n.trim() }).eq('id', id); onSaved(); }}><div><h3>Workspace name</h3><Input value={n} maxLength={80} onChange={e => setN(e.target.value)} /></div><Button type="submit" variant="outline">Save</Button></form>;
}

export function ProAstronaut({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const fetchDetail = useServerFn(getAstronautDetail); const review = useServerFn(professionalAiReview);
  const q = useQuery({ queryKey: ['pro-astro', workspaceId, userId], queryFn: () => fetchDetail({ data: { workspaceId, userId } }) });
  const [ai, setAi] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false); const [question, setQuestion] = useState('');
  if (q.isLoading) return <p>Loading profile…</p>;
  if (q.error || !q.data) return <div className="healthcare-gate"><h1>Access unavailable</h1><p>This profile isn’t available with your permissions in this workspace.</p><Button asChild><Link to="/pro"><ArrowLeft />Your workspaces</Link></Button></div>;
  const { records, assessment: a, alerts, member } = q.data;
  const profile = records.find(r => r.kind === 'profile')?.payload as unknown as { name?: string; birthDate?: string; missionStart?: string; gender?: string } | undefined;
  const checkins = records.filter(r => r.kind === 'checkin' || r.kind === 'note').map(r => r.payload as unknown as Journal).sort((x, y) => y.date.localeCompare(x.date));
  const voice = records.filter(r => r.kind === 'voice').map(r => r.payload as unknown as { id: string; date: string; transcript: string; covered: string[]; duration: number });
  return <>
    <Link to="/pro/$workspaceId" params={{ workspaceId }} className="eyebrow inline-flex items-center gap-1"><ArrowLeft size={14} />Workspace overview</Link>
    <div className="page-heading"><div><div className="eyebrow">INDIVIDUAL ASTRONAUT PROFILE</div><h1>{profile?.name || member.display_name || 'Astronaut'}</h1><p>{profile?.missionStart ? `Mission start ${formatDate(profile.missionStart)}` : 'Mission start not shared'}{profile?.birthDate ? ` · Born ${formatDate(profile.birthDate)}` : ''}{profile?.gender ? ` · ${profile.gender}` : ''}</p></div><RiskBadge risk={a.risk} /></div>
    <div className="pro-stats"><div><span>Check-ins shared</span><strong>{a.checkIns}</strong></div><div><span>Baseline</span><strong>{a.baselinePhase === 'established' ? 'Established' : `Building (${a.baselineCheckIns}/14)`}</strong></div><div><span>Confidence</span><strong>{a.confidence ?? 'n/a'}</strong></div><div><span>Last shared</span><strong>{a.lastSynced ? formatDate(a.lastSynced) : 'Never'}</strong></div></div>
    <section className="pro-panel"><h2>Calculated assessment <span className="data-tag">CALCULATED</span></h2>
      <p><strong>Risk reason:</strong> {a.riskReason ?? 'No risk indicators found in shared data.'}</p>
      <p><strong>Language screening:</strong> {a.screening.concernHits} concern indicator(s){a.screening.reason ? ` — ${a.screening.reason}` : ''}</p>
      <table className="pro-table mt-3"><thead><tr><th>Indicator</th><th>Baseline</th><th>Last 7 days</th><th>Change</th></tr></thead><tbody>{a.deviations.map(dv => <tr key={dv.dimension}><td>{dv.dimension}</td><td>{dv.baseline ?? <em>missing</em>}</td><td>{dv.recent ?? <em>missing</em>}</td><td className={dv.delta !== null && dv.delta <= -0.6 ? 'text-destructive font-semibold' : ''}>{dv.delta ?? '—'}</td></tr>)}</tbody></table>
      <h3 className="mt-4">Missing information <span className="data-tag">MISSING</span></h3><ul className="list-disc pl-5">{a.missing.map(m => <li key={m}>{m}</li>)}</ul>
    </section>
    <section className="pro-panel"><h2>Trend (self-reported, 1–5) <span className="data-tag">MEASURED</span></h2><TrendChart trend={a.trend} /></section>
    <section className="pro-panel"><h2><Sparkles size={18} />Professional AI review <span className="data-tag">AI INTERPRETATION</span></h2>
      <p>Full, unfiltered analysis of the shared records. It cannot change the calculated risk level and must state its uncertainty.</p>
      <div className="flex flex-wrap gap-2 mt-3"><Input value={question} placeholder="Optional: ask a specific question" maxLength={1000} onChange={e => setQuestion(e.target.value)} className="max-w-lg" /><Button disabled={busy} onClick={async () => { setBusy(true); try { const r = await review({ data: { workspaceId, userId, question } }); setAi(r); } catch { setAi({ ok: false, text: 'The review could not be completed. Check your connection.' }); } setBusy(false); }}>{busy ? 'Reviewing…' : 'Run AI review'}</Button></div>
      {ai && <div className={`ai-review ${ai.ok ? '' : 'text-destructive'}`}>{ai.text.split('\n').map((l, i) => l.startsWith('#') ? <h3 key={i}>{l.replace(/^#+\s*/, '')}</h3> : <p key={i}>{l.replace(/\*\*/g, '')}</p>)}</div>}
    </section>
    <section className="pro-panel"><h2>Alerts & escalation history</h2>{alerts.length ? alerts.map(al => <div key={al.id} className="pro-row"><span>{al.level} · {al.reason}</span><span>{formatDate(al.created_at)} · {al.status}</span></div>) : <p>No alerts recorded.</p>}</section>
    <section className="pro-panel"><h2>Check-in history <span className="data-tag">MEASURED</span></h2>{checkins.map(c => <details key={c.id} className="pro-entry"><summary><strong>{formatDate(c.date)}</strong> · {(c.kind ?? 'official') === 'official' ? 'Daily check-in' : 'Supplementary note'}{c.revisions?.length ? ` · ${c.revisions.length} revision(s)` : ''}</summary>
      {c.note && <p>{c.note}</p>}
      {Object.keys(c.ratings ?? {}).length > 0 && <div className="pro-ratings">{ratingQuestions.map(([k]) => c.ratings[k] !== undefined && <span key={k}>{k}: <strong>{c.ratings[k]}</strong></span>)}</div>}
      {reflectionQuestions.map(rq => c.reflections?.[rq] && <p key={rq}><em>{rq}</em><br />{c.reflections[rq]}</p>)}
    </details>)}{!checkins.length && <p>No check-ins shared yet. Use “Request update” on the overview.</p>}</section>
    <section className="pro-panel"><h2>Voice reflection transcripts <span className="data-tag">MEASURED</span></h2>{voice.map(v => <details key={v.id} className="pro-entry"><summary><strong>{formatDate(v.date)}</strong> · {Math.round(v.duration / 60)} min · topics: {v.covered.join(', ') || 'none ticked'}</summary><p>{v.transcript || <em>No transcript available (audio stays on the astronaut’s device).</em>}</p></details>)}{!voice.length && <p>No voice reflections shared yet.</p>}</section>
    <section className="pro-panel"><h2>Sensor data</h2><p>Physiological sensors are simulated in this prototype, so no measurements are shared or used for risk scoring.</p></section>
  </>;
}
function TrendChart({ trend }: { trend: { date: string; scores: Partial<Record<string, number>> }[] }) {
  if (trend.length < 2) return <p>Not enough check-ins to draw a trend.</p>;
  const dims = ['mood', 'stress', 'sleep', 'energy', 'connection', 'cognitive']; const w = 640, h = 160;
  const x = (i: number) => 20 + i * (w - 40) / (trend.length - 1); const y = (v: number) => h - 15 - (v - 1) / 4 * (h - 30);
  return <svg viewBox={`0 0 ${w} ${h}`} className="pro-chart" role="img" aria-label="Self-reported trend">{dims.map((d, di) => <polyline key={d} fill="none" strokeWidth={2} className={`trend-line trend-${di}`} points={trend.map((t, i) => t.scores[d] !== undefined ? `${x(i)},${y(t.scores[d]!)}` : '').filter(Boolean).join(' ')} />)}<g className="trend-legend">{dims.map((d, di) => <text key={d} x={20 + di * 100} y={12} className={`trend-${di}`}>{d}</text>)}</g></svg>;
}
