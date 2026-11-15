import type { Journal, VoiceNote } from '../orbit';
import { isOfficial } from '../orbit';
import type { SensorSource } from '../sensors';
import { dimensionScores, type Baseline } from './baseline';
import { screenText } from './risk';
import type { Analysis, Confidence, Dimension, DimensionResult } from './types';

export type AnalysisInput = { today: string; entries: Journal[]; voice: Pick<VoiceNote, 'date' | 'transcript'>[]; baseline: Baseline; sensors: SensorSource | null };
const words: Record<Dimension, [string, string, string]> = {
  sleep: ['Less restful', 'Restful', 'Very restful'], stress: ['Feeling stretched', 'Balanced', 'Calm'], energy: ['Lower than usual', 'Steady', 'Energised'],
  mood: ['A bit heavier', 'Even', 'Bright'], connection: ['A little distant', 'Connected', 'Strongly connected'], cognitive: ['Feels demanding', 'Manageable', 'Clear-headed'],
};
const notes: Record<Dimension, [string, string, string]> = {
  sleep: ['Rest may need a little more room this week.', 'Close to your usual rhythm.', 'Above your usual rhythm.'],
  stress: ['Some extra room to decompress could help.', 'In line with your usual range.', 'Lighter than your usual range.'],
  energy: ['Pacing tasks may help this week.', 'In your usual range.', 'Above your usual range.'],
  mood: ['Be gentle with yourself this week.', 'Similar to your usual pattern.', 'A good stretch overall.'],
  connection: ['Crew or home time may feel good.', 'Regular connection with others.', 'Plenty of connection lately.'],
  cognitive: ['Short breaks between tasks may help.', 'Recovery seems to be keeping up.', 'Focus feels easier than usual.'],
};
export const MIN_RECENT_CHECKINS = 3;

/** Transparent rule-based analysis; used as fallback and as the evidence layer under any LLM provider. */
export function ruleBasedAnalysis(input: AnalysisInput, provider = { id: 'rules', label: 'On-device pattern analysis' }): Analysis {
  const weekAgo = new Date(`${input.today}T12:00:00`); weekAgo.setDate(weekAgo.getDate() - 6); const from = weekAgo.toISOString().slice(0, 10);
  const recent = input.entries.filter(e => isOfficial(e) && e.date >= from && e.date <= input.today);
  const notesRecent = input.entries.filter(e => !isOfficial(e) && e.date >= from);
  const transcripts = input.voice.filter(v => v.transcript && v.date.slice(0, 10) >= from).map(v => v.transcript!);
  const texts = [...recent.flatMap(e => Object.values(e.reflections)), ...notesRecent.map(n => n.note ?? ''), ...transcripts];
  const screen = screenText(texts);
  const sensorDays = input.sensors ? 7 : 0;
  const dims = (['sleep', 'stress', 'energy', 'mood', 'connection', 'cognitive'] as Dimension[]).map((d): DimensionResult => {
    const vals = recent.map(e => dimensionScores(e)[d]).filter((x): x is number => x !== undefined);
    const sensorBacked = d === 'sleep' || d === 'energy';
    const b = input.baseline.values[d];
    if (vals.length < MIN_RECENT_CHECKINS || b === undefined) {
      return { dimension: d, word: 'Not enough information yet', note: vals.length < MIN_RECENT_CHECKINS ? `Needs at least ${MIN_RECENT_CHECKINS} check-ins this week (${vals.length} so far).` : 'Your baseline is still being built.', trend: null, confidence: null, sources: vals.length ? ['self_report'] : [], insufficientData: true, delta: null };
    }
    const avg = vals.reduce((a, c) => a + c, 0) / vals.length; const delta = +(avg - b).toFixed(2);
    const idx = delta <= -.6 ? 0 : delta >= .6 ? 2 : 1;
    let confidence: Confidence = vals.length >= 6 && input.baseline.reliable ? 'good' : vals.length >= 4 ? 'moderate' : 'low';
    if (!input.baseline.reliable) confidence = 'low';
    if (d === 'cognitive' || d === 'connection') confidence = confidence === 'good' ? 'moderate' : confidence; // indirect from self-report
    return { dimension: d, word: words[d][idx], note: notes[d][idx], trend: idx === 0 ? 'lower' : idx === 2 ? 'higher' : 'usual', confidence, sources: ['self_report', ...(sensorBacked && input.sensors ? ['sensor' as const] : [])], insufficientData: false, delta };
  });
  const lower = dims.filter(d => d.trend === 'lower');
  const attention = screen.risk !== 'none' || lower.length >= 3;
  const risk = screen.risk === 'severe' ? 'severe' : attention ? 'attention' : 'none';
  const recs: string[] = [];
  if (lower.some(d => d.dimension === 'sleep')) recs.push('If it suits you, try keeping a familiar wind-down routine before sleep.');
  if (lower.some(d => d.dimension === 'stress' || d.dimension === 'cognitive')) recs.push('You might schedule a short pause between demanding tasks.');
  if (lower.some(d => d.dimension === 'connection')) recs.push('A call home or shared crew meal could be worth making time for.');
  if (lower.some(d => d.dimension === 'mood' || d.dimension === 'energy')) recs.push('Consider an activity that usually restores you, like music, exercise or the cupola view.');
  if (!recs.length) recs.push('Keep doing what is working for you. Small routines protect your rhythm.');
  const insufficient = dims.filter(d => d.insufficientData).length;
  const summary = insufficient === dims.length ? 'There isn’t enough recent information yet for a meaningful picture. A few more check-ins will help.' : lower.length ? `This week, ${lower.map(d => d.dimension === 'cognitive' ? 'focus' : d.dimension).join(', ')} ${lower.length > 1 ? 'are' : 'is'} below your usual pattern. The suggestions below are optional.` : 'This week looks close to your usual pattern.';
  return { date: input.today, generatedAt: new Date().toISOString(), providerId: provider.id, providerLabel: provider.label, dimensions: dims, summary, recommendations: recs, attention, risk, riskReason: screen.reason ?? (lower.length >= 3 ? 'Several areas are below your baseline at the same time.' : undefined), dataUsed: { checkIns: recent.length, notes: notesRecent.length, transcripts: transcripts.length, sensorDays } };
}
