import { useEffect, useState } from 'react';
import { getVoiceNotes, todayDate, useJournals } from '../orbit';
import { useProfile } from '../profile';
import { getSensorSource } from '../sensors';
import { computeBaseline } from './baseline';
import { aiAdvicePaused, flag, loadEscalation, storeEscalation, type Escalation } from './escalation';
import { loadMemory, remember, type Memory } from './memory';
import { preferredProviderId, providers, rulesProvider } from './providers';
import { onLlmStatus } from './llm';
import type { Analysis } from './types';

/** Shared hook: runs the selected provider over journals + voice transcripts and keeps memory/escalation in sync. */
export function useWellbeing() {
  const { entries, ready } = useJournals(); const { profile } = useProfile();
  const [analysis, setAnalysis] = useState<Analysis | null>(null); const [memory, setMemory] = useState<Memory>({ analyses: [], concerns: [] });
  const [escalation, setEscalation] = useState<Escalation | null>(null); const [busy, setBusy] = useState(false); const [tick, setTick] = useState(0);
  const today = todayDate();
  const start = (profile?.onboardedAt ?? new Date().toISOString()).slice(0, 10);
  const realStart = entries.filter(e => !e.id.startsWith('demo')).map(e => e.date).sort()[0];
  const baselineStart = [start, realStart ?? start, entries.map(e => e.date).sort()[0] ?? start].sort()[0]!;
  const flagged = memory.analyses.filter(a => a.risk !== 'none').map(a => a.date);
  const baseline = computeBaseline(entries, baselineStart, today, flagged);
  useEffect(() => { setMemory(loadMemory()); setEscalation(loadEscalation()); const r = () => setTick(t => t + 1); const e = () => setEscalation(loadEscalation()); window.addEventListener('orbit-ai-refresh', r); window.addEventListener('orbit-escalation', e); const off = onLlmStatus(s => { if (s.state === 'ready') r(); }); return () => { window.removeEventListener('orbit-ai-refresh', r); window.removeEventListener('orbit-escalation', e); off(); }; }, []);
  useEffect(() => {
    if (!ready) return; let cancelled = false;
    (async () => {
      setBusy(true);
      const voice = await getVoiceNotes().catch(() => []);
      const input = { today, entries, voice, baseline: computeBaseline(entries, baselineStart, today, loadMemory().analyses.filter(a => a.risk !== 'none').map(a => a.date)), sensors: getSensorSource() };
      setAnalysis(await rulesProvider.analyze(input)); // instant, offline
      const chosen = providers.find(p => p.id === preferredProviderId());
      let result: Analysis | null = null;
      if (chosen && chosen.id !== 'rules' && await chosen.available()) result = await chosen.analyze(input).catch(() => null);
      result ??= await rulesProvider.analyze(input);
      if (cancelled) return;
      setAnalysis(result); setMemory(remember(result));
      if (result.risk === 'severe') { const esc = flag(loadEscalation(), result.riskReason ?? 'Safety concern', new Date().toISOString()); storeEscalation(esc); setEscalation(esc); }
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [ready, entries.length, entries[0]?.updatedAt, tick]);
  return { analysis, baseline, memory, escalation, paused: escalation ? aiAdvicePaused(escalation) : false, busy, entries };
}
