import { missionDay, todayDate, type Journal } from './orbit';
/** Builds 30 days of realistic official check-ins ending yesterday, with a mid-month stress dip and recovery. */
export function sampleMonth(today = todayDate()): Journal[] {
  const pos = ['Shared dinner with the crew and laughed a lot.', 'Experiment ran cleanly on the first try.', 'Video call with family this evening.', 'Watched the sunrise over the Pacific from the cupola.', 'Good workout, felt strong.'];
  const hard = ['Long EVA prep day, tiring.', 'Slept poorly, noisy fans.', 'Schedule changed last minute, felt rushed.', 'Missed home today.', 'Equipment fault took hours to fix.'];
  const out: Journal[] = [];
  for (let i = 30; i >= 1; i--) {
    const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10);
    const dip = i >= 12 && i <= 17 ? 1 : 0; const n = (s: number) => Math.sin(i * s);
    const c = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
    const ratings = { Mood: c(4 - dip + n(.9) * .6), Stress: c(2 + dip * 1.5 + n(1.3) * .6), Sleep: c(4 - dip + n(.7) * .7), Energy: c(3.8 - dip + n(1.1) * .6), Concentration: c(4 - dip * .8 + n(.5) * .5), Connection: c(4 + n(.6) * .6), Isolation: c(2 + dip + n(.8) * .5), Motivation: c(4 - dip * .5 + n(1.7) * .5) };
    const at = `${date}T20:${String(10 + (i % 40)).padStart(2, '0')}:00.000Z`;
    out.push({ id: `sample-${date}`, kind: 'official', date, day: missionDay(date), createdAt: at, updatedAt: at, ratings, revisions: [],
      reflections: { 'What was the most challenging part of today?': hard[i % hard.length], 'What was something positive that happened today?': pos[i % pos.length], 'Is there anything else you would like to reflect on?': dip ? 'Feeling a bit stretched this week.' : '' } });
  }
  return out;
}
export function loadSampleMonth() {
  const existing: Journal[] = JSON.parse(localStorage.getItem('orbit-journals-v1') || '[]');
  const taken = new Set(existing.filter(e => (e.kind ?? 'official') === 'official').map(e => e.date));
  const added = sampleMonth().filter(e => !taken.has(e.date));
  const next = [...added, ...existing].sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem('orbit-journals-v1', JSON.stringify(next));
  window.dispatchEvent(new Event('orbit-journals-change')); window.dispatchEvent(new Event('orbit-ai-refresh'));
  return added.length;
}
