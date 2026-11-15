import type { Journal } from '../orbit';
import { isOfficial } from '../orbit';
import { computeBaseline, dimensionScores } from '../ai/baseline';
import { ruleBasedAnalysis } from '../ai/fallback';
import { screenText } from '../ai/risk';
import { dimensionLabels, type Dimension } from '../ai/types';

import type { Json } from '@/integrations/supabase/types';
export type ProRecord = { kind: string; local_id: string; record_date: string | null; payload: Json; synced_at: string };
export type ProRisk = 'low' | 'moderate' | 'high';
export type ProAssessment = {
  risk: ProRisk; riskReason: string | null; confidence: 'low' | 'moderate' | 'good' | null;
  baselinePhase: 'building' | 'established'; baselineCheckIns: number;
  deviations: { dimension: string; baseline: number | null; recent: number | null; delta: number | null; label: 'calculated' }[];
  screening: { concernHits: number; reason: string | null };
  missing: string[]; checkIns: number; notes: number; transcripts: number; lastCheckIn: string | null; lastSynced: string | null;
  trend: { date: string; scores: Partial<Record<Dimension, number>> }[];
};

/** Deterministic professional assessment. Unfiltered: every finding is reported with its evidence and gaps. */
export function assessRecords(records: ProRecord[], today: string): ProAssessment {
  const journals = records.filter(r => r.kind === 'checkin' || r.kind === 'note').map(r => r.payload as unknown as Journal);
  const voice = records.filter(r => r.kind === 'voice').map(r => r.payload as unknown as { date: string; transcript?: string });
  const profile = records.find(r => r.kind === 'profile')?.payload as unknown as { missionStart?: string } | undefined;
  const official = journals.filter(isOfficial).sort((a, b) => a.date.localeCompare(b.date));
  const start = profile?.missionStart && official[0] && profile.missionStart < official[0].date ? profile.missionStart : official[0]?.date ?? today;
  const allTexts = [...journals.flatMap(j => [...Object.values(j.reflections ?? {}), j.note ?? '']), ...voice.map(v => v.transcript ?? '')].filter(Boolean);
  const fullScreen = screenText(allTexts);
  const flagged = official.filter(j => screenText(Object.values(j.reflections ?? {})).risk !== 'none').map(j => j.date);
  const baseline = computeBaseline(journals, start, today, flagged);
  const a = ruleBasedAnalysis({ today, entries: journals, voice: voice.map(v => ({ date: v.date, transcript: v.transcript ?? '' })), baseline, sensors: null });
  const risk: ProRisk = a.risk === 'severe' || fullScreen.risk === 'severe' ? 'high' : a.risk === 'attention' || fullScreen.risk === 'attention' ? 'moderate' : 'low';
  const missing: string[] = [];
  if (!official.length) missing.push('No check-ins have been shared yet.');
  if (!baseline.reliable) missing.push(`Baseline not reliable yet (${baseline.checkIns} of 14 check-ins needed).`);
  if (a.dataUsed.checkIns < 3) missing.push(`Only ${a.dataUsed.checkIns} check-in(s) in the last 7 days.`);
  missing.push('Sensor data shown in this prototype is simulated and excluded from risk scoring.');
  const weekAgo = new Date(new Date(today + 'T12:00:00Z').getTime() - 6 * 864e5).toISOString().slice(0, 10);
  const recentScores = official.filter(j => j.date >= weekAgo && j.date <= today).map(j => dimensionScores(j));
  const recentMean = (d: Dimension) => { const v = recentScores.map(s => s[d]).filter((x): x is number => typeof x === 'number'); return v.length ? +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2) : null; };
  const confs = a.dimensions.map(d => d.confidence).filter(Boolean);
  return {
    risk, riskReason: a.riskReason ?? fullScreen.reason ?? 'No risk indicators found in shared data.',
    confidence: confs.includes('low') ? 'low' : confs.includes('moderate') ? 'moderate' : confs.length ? 'good' : official.length ? 'low' : null,
    baselinePhase: baseline.phase, baselineCheckIns: baseline.checkIns,
    deviations: a.dimensions.map(d => { const b = baseline.values[d.dimension]; return { dimension: dimensionLabels[d.dimension], baseline: b === undefined ? null : +b.toFixed(2), recent: recentMean(d.dimension), delta: baseline.reliable ? d.delta : null, label: 'calculated' as const }; }),
    screening: { concernHits: fullScreen.concernHits, reason: fullScreen.reason ?? null },
    missing, checkIns: official.length, notes: journals.length - official.length, transcripts: voice.filter(v => v.transcript).length,
    lastCheckIn: official.at(-1)?.date ?? null,
    lastSynced: records.map(r => r.synced_at).sort().at(-1) ?? null,
    trend: official.slice(-30).map(j => ({ date: j.date, scores: dimensionScores(j) })),
  };
}
