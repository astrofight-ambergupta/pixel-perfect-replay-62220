import { Link } from '@tanstack/react-router';
import { Activity, AlertCircle, ArrowUpRight, Brain, Download, Info, Leaf, LifeBuoy, Moon, Send, Smile, Sparkles, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BASELINE_DAYS, MIN_BASELINE_CHECKINS, type Baseline } from '@/lib/ai/baseline';
import { requestFalseAlarmReview, retry, storeEscalation, type Escalation } from '@/lib/ai/escalation';
import { getLlmStatus, isModelCached, loadLocalModel, onLlmStatus, webGpuAvailable, type LlmStatus } from '@/lib/ai/llm';
import { significantDays } from '@/lib/ai/memory';
import { localLlmProvider, preferredProviderId, providers, setPreferredProvider } from '@/lib/ai/providers';
import { dimensionLabels, sourceLabels, type Analysis, type Dimension } from '@/lib/ai/types';
import { useWellbeing } from '@/lib/ai/wellbeing';
import { formatDate } from '@/lib/orbit';
import { OrbitChart } from './orbit-chart';

const icons: Record<Dimension, typeof Moon> = { sleep: Moon, stress: Leaf, energy: Zap, mood: Smile, connection: Users, cognitive: Activity };
const tones: Record<Dimension, string> = { sleep: 'blue', stress: 'green', energy: 'amber', mood: 'green', connection: 'blue', cognitive: 'navy' };
const chartMetric: Record<Dimension, string> = { sleep: 'sleep', stress: 'hrv', energy: 'activity', mood: 'heart', connection: 'heart', cognitive: 'hrv' };

export function useLlmStatus() {
  const [s, setS] = useState<LlmStatus>(getLlmStatus()); const [cached, setCached] = useState(false); const [gpu, setGpu] = useState(true);
  useEffect(() => { setGpu(webGpuAvailable()); isModelCached().then(setCached); return onLlmStatus(setS); }, []);
  return { status: s, cached, gpu };
}
export function AiModelCard({ compact = false }: { compact?: boolean }) {
  const { status, cached, gpu } = useLlmStatus();
  if (status.state === 'ready') return <div className="ai-model-row ai-ready"><Sparkles size={15}/>On-device AI ready · works offline</div>;
  if (!gpu || status.state === 'unsupported') return <div className="ai-model-row"><Info size={15}/>This device can’t run the on-device AI model, so on-device pattern analysis is used instead.</div>;
  if (status.state === 'downloading') return <div className="ai-model-row"><Download size={15}/><span>Preparing on-device AI… {Math.round(status.progress * 100)}%</span><div className="ai-progress"><i style={{ width: `${Math.round(status.progress * 100)}%` }}/></div></div>;
  return <div className="ai-model-row"><Sparkles size={15}/><span>{cached ? 'On-device AI is saved on this device.' : compact ? 'Pattern analysis active.' : 'Pattern analysis is active. For written summaries, get ORBIT’s on-device AI (about 900 MB, one-time download, then works offline).'}</span><Button size="sm" variant="outline" onClick={() => { void loadLocalModel().catch(() => {}); }}>{cached ? 'Load AI' : 'Download on-device AI'}</Button>{status.state === 'error' && <small className="form-error">{status.text}</small>}</div>;
}
export function GlanceReport() {
  const { analysis, paused, busy } = useWellbeing();
  return <>
    <div className="section-header overview-heading"><div><h2>Glance Report</h2><p>{analysis ? `${analysis.providerLabel} · ${analysis.dataUsed.checkIns} check-ins, ${analysis.dataUsed.notes} notes, ${analysis.dataUsed.transcripts} voice transcripts this week${busy ? ' · updating…' : ''}` : 'Reading your recent check-ins…'}</p></div><Link to="/companion">Open AI companion <ArrowUpRight size={14}/></Link></div>
    <AiModelCard compact/>
    {analysis?.attention && <Link to="/companion" className="attention-marker"><AlertCircle size={16}/>Some patterns may need a little extra attention. See your AI companion.</Link>}
    <div className="wellbeing-grid">{(analysis?.dimensions ?? []).map(d => { const Icon = icons[d.dimension]; return <section className={`wellbeing-card ${d.insufficientData ? 'is-insufficient' : ''}`} key={d.dimension}>
      <span className={`metric-icon tone-${tones[d.dimension]}`}><Icon size={17}/></span><span className="metric-label">{dimensionLabels[d.dimension]}</span>
      <h3>{d.word}</h3><p>{paused && !d.insufficientData ? 'Advice paused while support is arranged.' : d.note}</p>
      <div className="glance-meta">{d.confidence && <span className={`confidence confidence-${d.confidence}`}>{d.confidence === 'good' ? 'Good' : d.confidence === 'moderate' ? 'Moderate' : 'Low'} confidence</span>}{d.sources.map(s => <span key={s} className="source-tag">{sourceLabels[s]}</span>)}</div>
      {!d.insufficientData && d.sources.includes('sensor') && <OrbitChart mini metric={chartMetric[d.dimension]}/>}
    </section>; })}</div>
    <p className="glance-footnote">Interpretations compare your own reports with your personal baseline. They are not measurements or diagnoses.</p>
  </>;
}
export function BaselineProgress({ baseline }: { baseline: Baseline }) {
  const pct = Math.round(Math.min(1, baseline.checkIns / MIN_BASELINE_CHECKINS) * 100);
  return <section className="surface baseline-progress"><div className="panel-title"><div><h3>Personal baseline</h3><p>{baseline.phase === 'established' ? 'Established. Adjusts slowly, and leaves out flagged days.' : `Building during your first ${BASELINE_DAYS} days`}</p></div><span className={`inline-pill ${baseline.reliable ? 'is-good' : ''}`}>{baseline.reliable ? 'Enough data' : 'Not yet reliable'}</span></div>
    <div className="ai-progress large"><i style={{ width: `${pct}%` }}/></div>
    <p className="baseline-caption">Day {baseline.daysElapsed} of {BASELINE_DAYS} · {baseline.checkIns} of at least {MIN_BASELINE_CHECKINS} check-ins{baseline.excludedDays ? ` · ${baseline.excludedDays} flagged day(s) left out` : ''}</p></section>;
}
export function EscalationPanel({ escalation }: { escalation: Escalation }) {
  const stages = [['queued', 'Flagged & notification queued'], ['awaiting', 'Awaiting professional confirmation'], ['confirmed', 'Professional confirmed']] as const;
  const idx = escalation.stage === 'confirmed' ? 2 : escalation.stage === 'awaiting' ? 1 : 0;
  return <section className="escalation-panel" role="alert"><div className="escalation-head"><LifeBuoy size={20}/><div><strong>Support is being arranged</strong>{escalation.simulated && <span className="sim-badge">Simulated: no message sent to Earth</span>}</div></div>
    <p>{escalation.stage === 'confirmed' ? 'A professional has confirmed they are now leading your support. ORBIT will help by organising information for them.' : 'ORBIT has paused its own wellbeing suggestions until a professional confirms they are taking over. If you need help now, contact your crew or flight surgeon through your mission channel.'}</p>
    <ol className="escalation-steps">{stages.map(([k, l], i) => <li key={k} className={i <= idx ? 'done' : ''}>{l}</li>)}</ol>
    <div className="escalation-actions"><Button size="sm" variant="outline" onClick={() => storeEscalation(retry(escalation, new Date().toISOString()))}>Retry notification</Button>{!escalation.falseAlarmReview && <Button size="sm" variant="ghost" onClick={() => storeEscalation(requestFalseAlarmReview(escalation, new Date().toISOString()))}>I think this is a false alarm</Button>}</div>
    {escalation.falseAlarmReview && <small>Your false-alarm note is recorded. The alert stays open until a professional reviews it.</small>}
    <details><summary>Activity log ({escalation.attempts} attempt{escalation.attempts === 1 ? '' : 's'})</summary>{escalation.log.map((l, i) => <p key={i}>{new Date(l.at).toLocaleString()} · {l.text}</p>)}</details></section>;
}
function contextFor(a: Analysis | null) { return a ? `${a.summary}\n${a.dimensions.map(d => `${d.dimension}: ${d.insufficientData ? 'not enough data' : d.trend}`).join(', ')}\nSuggestions: ${a.recommendations.join(' ')}` : 'No analysis yet.'; }
export function Companion() {
  const { analysis, baseline, memory, escalation, paused, entries } = useWellbeing(); const { status } = useLlmStatus();
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]); const [q, setQ] = useState(''); const [thinking, setThinking] = useState(false);
  async function ask(e: React.FormEvent) {
    e.preventDefault(); const question = q.trim(); if (!question || thinking) return; setQ(''); setChat(c => [...c, { role: 'user', text: question }]);
    if (paused) { setChat(c => [...c, { role: 'assistant', text: 'While support is being arranged I’m not giving my own wellbeing advice. Please reach your crew or flight surgeon through your mission channel.' }]); return; }
    if (status.state !== 'ready') { setChat(c => [...c, { role: 'assistant', text: 'Questions need the on-device AI. Load it above to chat. It works offline once downloaded.' }]); return; }
    setThinking(true);
    try { const a = await localLlmProvider.chat!(question, contextFor(analysis)); setChat(c => [...c, { role: 'assistant', text: a }]); }
    catch { setChat(c => [...c, { role: 'assistant', text: 'I couldn’t answer just now. Please try again.' }]); } finally { setThinking(false); }
  }
  const sig = significantDays(entries, baseline);
  return <>
    <div className="page-heading"><div><div className="eyebrow">YOUR WELLBEING COMPANION</div><h1>AI companion</h1><p>Summaries and gentle suggestions, based on your check-ins and voice reflections.</p></div><span className="subtle-chip">{analysis?.providerLabel ?? 'Starting…'}</span></div>
    {escalation && escalation.stage !== 'none' && <EscalationPanel escalation={escalation}/>}
    <AiModelCard/>
    <BaselineProgress baseline={baseline}/>
    <div className="companion-grid">
      <section className="surface"><div className="panel-title"><div><h3>Today’s summary</h3><p>{analysis ? `Updated ${new Date(analysis.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p></div>{analysis?.attention && <span className="inline-pill">Needs attention</span>}</div>
        <p>{analysis?.summary}</p>
        <h4 className="companion-sub">Suggestions, if they suit you</h4>
        {paused ? <p className="muted">Paused while a professional is being reached.</p> : <ul className="rec-list">{analysis?.recommendations.map(r => <li key={r}><Sparkles size={14}/>{r}</li>)}</ul>}
      </section>
      <section className="surface chat-panel"><div className="panel-title"><div><h3>Ask about your suggestions</h3><p>Runs on this device. Not a substitute for professional care.</p></div></div>
        <div className="chat-log">{chat.length === 0 && <p className="muted">Try “Why is rest suggested?”</p>}{chat.map((m, i) => <p key={i} className={`chat-msg chat-${m.role}`}>{m.text}</p>)}{thinking && <p className="chat-msg chat-assistant muted">Thinking…</p>}</div>
        <form onSubmit={ask} className="chat-form"><input aria-label="Ask ORBIT" value={q} maxLength={500} onChange={e => setQ(e.target.value)} placeholder="Ask a question…"/><Button size="icon" type="submit" aria-label="Send"><Send size={16}/></Button></form>
      </section>
    </div>
    <div className="companion-grid">
      <section className="surface"><div className="panel-title"><div><h3>Patterns over time</h3><p>Whether earlier changes improved, continued or worsened</p></div><Brain size={18} className="text-primary"/></div>
        {memory.concerns.length ? <ul className="memory-list">{memory.concerns.map(c => <li key={c.dimension + c.since}><strong>{dimensionLabels[c.dimension]}</strong><span>since {formatDate(c.since)}</span><span className={`trend-tag trend-${c.status}`}>{c.status === 'resolved' ? 'Back to usual' : c.status === 'improving' ? 'Improving' : c.status === 'worsening' ? 'Lower than before' : 'Continuing'}</span></li>)}</ul> : <p className="muted">No ongoing changes from your baseline.</p>}
      </section>
      <section className="surface"><div className="panel-title"><div><h3>Days that stood out</h3><p>Compared with your own baseline</p></div></div>
        {sig.length ? <ul className="memory-list">{sig.map(s => <li key={s.entry.id}><Link to="/journal/$id" params={{ id: s.entry.id }}>{formatDate(s.entry.date)}</Link><span>Mission day {s.entry.day}</span></li>)}</ul> : <p className="muted">Nothing unusual so far.</p>}
        <h4 className="companion-sub">Daily summaries stored</h4><ul className="memory-list">{memory.analyses.slice(0, 5).map(a => <li key={a.date}><strong>{formatDate(a.date)}</strong><span>{a.summary}</span></li>)}</ul>
      </section>
    </div>
    <p className="glance-footnote">ORBIT does not diagnose. Health-team reporting will be available only through secure, authorised access.</p>
  </>;
}
export function AiSettings() {
  const [choice, setChoice] = useState('local-llm'); useEffect(() => setChoice(preferredProviderId()), []);
  return <div className="settings-row"><div><h3>AI analysis</h3><p>Choose how your check-ins and voice reflections are analysed. Safety screening always runs on this device.</p><AiModelCard compact/></div>
    <select aria-label="AI analysis method" value={choice} onChange={e => { setChoice(e.target.value); setPreferredProvider(e.target.value); }}>{providers.map(p => <option key={p.id} value={p.id} disabled={p.kind === 'remote'}>{p.label}</option>)}</select></div>;
}
