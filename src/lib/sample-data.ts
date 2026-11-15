import { missionDay, saveVoiceNote, getVoiceNotes, localDate, todayDate, type Journal } from './orbit';
import { voiceTopics } from './ai/coverage';
export const SAMPLE_DAYS = 21;
export const SAMPLE_DAYS_50 = 50;
/** Builds realistic official check-ins ending yesterday, with a mid-period stress dip and recovery. */
export function sampleMonth(today = todayDate(), days = SAMPLE_DAYS): Journal[] {
  const pos = ['Shared dinner with the crew and laughed a lot.', 'Experiment ran cleanly on the first try.', 'Video call with family this evening.', 'Watched the sunrise over the Pacific from the cupola.', 'Good workout, felt strong.'];
  const hard = ['Long EVA prep day, tiring.', 'Slept poorly, noisy fans.', 'Schedule changed last minute, felt rushed.', 'Missed home today.', 'Equipment fault took hours to fix.'];
  const out: Journal[] = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10);
    const dip = i >= 8 && i <= 12 ? 1 : 0; const n = (s: number) => Math.sin(i * s);
    const c = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
    const ratings = { Mood: c(4 - dip + n(.9) * .6), Stress: c(2 + dip * 1.5 + n(1.3) * .6), Sleep: c(4 - dip + n(.7) * .7), Energy: c(3.8 - dip + n(1.1) * .6), Concentration: c(4 - dip * .8 + n(.5) * .5), Connection: c(4 + n(.6) * .6), Isolation: c(2 + dip + n(.8) * .5), Motivation: c(4 - dip * .5 + n(1.7) * .5) };
    const at = `${date}T20:${String(10 + (i % 40)).padStart(2, '0')}:00.000Z`;
    out.push({ id: `sample-${date}`, kind: 'official', date, day: missionDay(date), createdAt: at, updatedAt: at, ratings, revisions: [],
      reflections: { 'What was the most challenging part of today?': hard[i % hard.length]!, 'What was something positive that happened today?': pos[i % pos.length]!, 'Is there anything else you would like to reflect on?': dip ? 'Feeling a bit stretched this week.' : '' } });
  }
  return out;
}
export function loadSampleMonth(days = SAMPLE_DAYS) {
  const existing: Journal[] = JSON.parse(localStorage.getItem('orbit-journals-v1') || '[]');
  const taken = new Set(existing.filter(e => (e.kind ?? 'official') === 'official').map(e => e.date));
  const added = sampleMonth(todayDate(), days).filter(e => !taken.has(e.date));
  const next = [...added, ...existing].sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem('orbit-journals-v1', JSON.stringify(next));
  window.dispatchEvent(new Event('orbit-journals-change')); window.dispatchEvent(new Event('orbit-ai-refresh'));
  return added.length;
}
/** Adds 50 days of sample check-ins and voice reflections, skipping days already filled. */
export async function loadSample50() {
  const journals = loadSampleMonth(SAMPLE_DAYS_50);
  const voice = await loadSampleVoice(todayDate(), SAMPLE_DAYS_50);
  return { journals, voice };
}

function silentWav(seconds = 1) { const rate = 8000, n = rate * seconds, b = new ArrayBuffer(44 + n), v = new DataView(b); const w = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); new Uint8Array(b, 44).fill(128); return new Blob([b], { type: 'audio/wav' }); }
const lines = ['A normal day starts with checks and a workout; I feel most fulfilled during experiments.', 'Under pressure today with a schedule change, but I regained focus by breaking tasks down.', 'Felt connected to the crew at dinner and called home, which helped me feel supported.', 'Concentration was steady in the morning; mental fatigue crept in late afternoon.'];
/** Adds a sample voice reflection (silent placeholder audio + transcript) for each sample day without one. */
export async function loadSampleVoice(today = todayDate(), days = SAMPLE_DAYS) {
  const have = new Set((await getVoiceNotes()).map(n => localDate(n.date))); let added = 0;
  for (let i = days; i >= 1; i--) { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10); if (have.has(date)) continue;
    const text = lines.map((l, k) => k === (i % 4) && i >= 8 && i <= 12 ? l + ' Honestly it has been a harder, more tiring week.' : l).join(' ');
    await saveVoiceNote({ id: `sample-voice-${date}`, date: `${date}T12:00:00.000Z`, prompt: 'Daily voice reflection', duration: 240 + (i * 37) % 300, phase: 'Active mission', audio: silentWav(), transcript: text, liveTranscript: text, covered: voiceTopics.map(t => t.label) }); added++; }
  window.dispatchEvent(new Event('orbit-ai-refresh')); return added;
}
