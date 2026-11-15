import type { Journal, VoiceNote } from '../orbit';
import { isOfficial } from '../orbit';
import { dimensionScores } from './baseline';
import { dimensionLabels, type Dimension } from './types';

/** Deterministic trend + action-plan engine. Scores are 1–5, higher = better on every dimension. */
export const DIMS: Dimension[] = ['sleep', 'stress', 'energy', 'mood', 'connection', 'cognitive'];
const friendly: Record<Dimension, string> = { sleep: 'sleep', stress: 'calm (low stress)', energy: 'energy', mood: 'mood', connection: 'connection', cognitive: 'focus' };

export type DimTrend = {
  dimension: Dimension; points: { date: string; value: number }[]; weekly: (number | null)[];
  last7: number | null; prev7: number | null; change: number | null; slope28: number | null;
  direction: 'improving' | 'declining' | 'steady' | 'unknown'; volatility: number | null; statement: string;
};
export type Pattern = { kind: 'link' | 'weekday' | 'streak' | 'theme' | 'swing'; text: string; strength: 'clear' | 'possible' };
export type TrendReport = { days: number; trends: DimTrend[]; patterns: Pattern[] };

const avg = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const addDays = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function slope(pts: { x: number; y: number }[]) { if (pts.length < 5) return null; const mx = avg(pts.map(p => p.x))!, my = avg(pts.map(p => p.y))!; let n = 0, d = 0; for (const p of pts) { n += (p.x - mx) * (p.y - my); d += (p.x - mx) ** 2; } return d ? n / d : null; }
function corr(a: number[], b: number[]) { if (a.length < 6) return null; const ma = avg(a)!, mb = avg(b)!; let n = 0, da = 0, db = 0; a.forEach((x, i) => { n += (x - ma) * (b[i]! - mb); da += (x - ma) ** 2; db += (b[i]! - mb) ** 2; }); return da && db ? n / Math.sqrt(da * db) : null; }

export function computeTrends(entries: Journal[], today: string, voice: Pick<VoiceNote, 'date' | 'transcript'>[] = []): TrendReport {
  const official = entries.filter(e => isOfficial(e) && e.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(official.map(e => [e.date, dimensionScores(e)]));
  const start56 = addDays(today, -55);
  const trends = DIMS.map((d): DimTrend => {
    const points = official.filter(e => e.date >= start56).map(e => ({ date: e.date, value: byDate.get(e.date)![d] })).filter((p): p is { date: string; value: number } => p.value !== undefined);
    const inRange = (from: number, to: number) => points.filter(p => p.date >= addDays(today, from) && p.date <= addDays(today, to)).map(p => p.value);
    const last7 = avg(inRange(-6, 0)), prev7 = avg(inRange(-13, -7));
    const weekly = Array.from({ length: 8 }, (_, i) => { const v = inRange(-7 * (8 - i) + 1, -7 * (7 - i)); return v.length >= 2 ? +avg(v)!.toFixed(2) : null; });
    const p28 = points.filter(p => p.date >= addDays(today, -27)).map(p => ({ x: (Date.parse(p.date) - Date.parse(today)) / 864e5, y: p.value }));
    const s = slope(p28); const change = last7 !== null && prev7 !== null ? +(last7 - prev7).toFixed(2) : null;
    const m = avg(p28.map(p => p.y)); const volatility = m !== null && p28.length >= 5 ? +Math.sqrt(avg(p28.map(p => (p.y - m) ** 2))!).toFixed(2) : null;
    const weekShift = s !== null ? s * 7 : null;
    let direction: DimTrend['direction'] = 'unknown';
    if (points.length >= 5) direction = (weekShift !== null && weekShift >= .25) || (change !== null && change >= .5) ? 'improving' : (weekShift !== null && weekShift <= -.25) || (change !== null && change <= -.5) ? 'declining' : 'steady';
    const label = friendly[d];
    const statement = direction === 'unknown' ? `Not enough ${label} check-ins yet to see a trend (${points.length} so far, need 5).`
      : `${dimensionLabels[d]} averaged ${last7?.toFixed(1) ?? '–'}/5 this week${prev7 !== null ? ` vs ${prev7.toFixed(1)} the week before` : ''}. ${direction === 'improving' ? `It has been rising over the last 4 weeks${weekShift !== null ? ` (about +${weekShift.toFixed(1)} per week)` : ''}.` : direction === 'declining' ? `It has been sliding over the last 4 weeks${weekShift !== null ? ` (about ${weekShift.toFixed(1)} per week)` : ''}.` : 'It has held fairly steady.'}${volatility !== null && volatility >= 1 ? ' Day-to-day swings are large.' : ''}`;
    return { dimension: d, points, weekly, last7, prev7, change, slope28: s, direction, volatility, statement };
  });

  const patterns: Pattern[] = [];
  // Links: does a night's sleep / stress relate to the same or next day's other scores?
  const pairs: [Dimension, Dimension, number, string][] = [['sleep', 'energy', 0, 'same day'], ['sleep', 'mood', 1, 'the next day'], ['sleep', 'cognitive', 0, 'same day'], ['stress', 'sleep', 1, 'the following night'], ['connection', 'mood', 0, 'same day']];
  for (const [a, b, lag, when] of pairs) {
    const xs: number[] = [], ys: number[] = [];
    for (const e of official) { const x = byDate.get(e.date)?.[a]; const y = byDate.get(addDays(e.date, lag))?.[b]; if (x !== undefined && y !== undefined) { xs.push(x); ys.push(y); } }
    const r = corr(xs, ys); if (r === null || Math.abs(r) < .35) continue;
    const goodA = xs.map((x, i) => x >= 4 ? ys[i]! : null).filter((v): v is number => v !== null); const badA = xs.map((x, i) => x <= 2 ? ys[i]! : null).filter((v): v is number => v !== null);
    const detail = goodA.length >= 2 && badA.length >= 2 ? ` On days your ${friendly[a]} was 4+ your ${friendly[b]} averaged ${avg(goodA)!.toFixed(1)}; when it was 2 or lower, ${avg(badA)!.toFixed(1)}.` : '';
    patterns.push({ kind: 'link', strength: Math.abs(r) >= .55 ? 'clear' : 'possible', text: a === 'stress' ? `Higher-stress days tend to be followed by worse sleep ${when}.${detail}` : `Your ${friendly[a]} tracks closely with your ${friendly[b]} ${when}.${detail}` });
  }
  // Weekday dips
  const names = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  for (const d of ['mood', 'stress', 'energy'] as Dimension[]) {
    const wk: number[][] = Array.from({ length: 7 }, () => []);
    for (const e of official) { const v = byDate.get(e.date)?.[d]; if (v !== undefined) wk[new Date(`${e.date}T12:00:00Z`).getUTCDay()]!.push(v); }
    const all = avg(wk.flat()); if (all === null || wk.flat().length < 21) continue;
    const worst = wk.map((v, i) => ({ i, m: v.length >= 3 ? avg(v)! : 99 })).sort((x, y) => x.m - y.m)[0]!;
    if (worst.m !== 99 && all - worst.m >= .6) patterns.push({ kind: 'weekday', strength: all - worst.m >= .9 ? 'clear' : 'possible', text: `${names[worst.i]} tend to be harder for your ${friendly[d]} (${worst.m.toFixed(1)} vs your usual ${all.toFixed(1)}).` });
  }
  // Low streaks
  for (const t of trends) {
    let run = 0, best = 0, end = ''; for (const p of t.points) { if (p.value <= 2.5) { run++; if (run > best) { best = run; end = p.date; } } else run = 0; }
    if (best >= 3) patterns.push({ kind: 'streak', strength: best >= 4 ? 'clear' : 'possible', text: `Your ${friendly[t.dimension]} stayed low for ${best} check-ins in a row, ending ${end}.${t.points.at(-1)!.value > 2.5 ? ' It has since recovered.' : ' This stretch is still going.'}` });
  }
  // Themes from written + spoken reflections (last 14 days)
  const from = addDays(today, -13);
  const text = [...official.filter(e => e.date >= from).flatMap(e => Object.values(e.reflections)), ...voice.filter(v => v.date.slice(0, 10) >= from).map(v => v.transcript ?? '')].join(' ').toLowerCase();
  const themes: [string, RegExp][] = [['workload / schedule pressure', /\b(deadline|workload|behind|busy|overtime|timeline|schedule)\b/g], ['tiredness', /\b(tired|exhausted|fatigue|drained|sleepy)\b/g], ['missing home', /\b(home|family|miss|kids|partner)\b/g], ['noise or sleep disruption', /\b(noise|woke|insomnia|restless|fan|alarm)\b/g], ['exercise', /\b(exercise|workout|treadmill|run|gym)\b/g], ['crew friction', /\b(argument|tension|conflict|frustrat)\w*/g]];
  for (const [name, re] of themes) { const n = text.match(re)?.length ?? 0; if (n >= 3) patterns.push({ kind: 'theme', strength: n >= 6 ? 'clear' : 'possible', text: `“${name}” came up ${n} times in your reflections over the last two weeks.` }); }
  return { days: official.length, trends, patterns };
}

export type ActionPlan = { id: string; title: string; why: string; steps: string[]; when: string; check: string; dimension: Dimension | null };

const library: Record<Dimension, Omit<ActionPlan, 'why' | 'id' | 'dimension'>> = {
  sleep: { title: 'Rebuild a consistent sleep window', when: 'Start tonight; keep it for 7 nights', check: 'Your Sleep rating averages 3.5+ for a week, or wake-ups drop.',
    steps: ['Pick a fixed lights-out and wake time that fits your schedule, and keep it within 30 minutes every day, including off-days.', 'Set a 45-minute wind-down alarm: dim cabin lights, stop screens and mission email, and do one calm activity (reading, stretching, music).', 'Stop caffeine at least 8 hours before lights-out and avoid heavy exercise in the last 2 hours.', 'Prepare your sleep station in advance: eye mask, earplugs, temperature set slightly cool, sleeping bag secured.', 'If you are awake for more than 20 minutes, get up, do something quiet in low light, and return when drowsy instead of lying there.'] },
  stress: { title: 'Build decompression into your day', when: 'Twice a day, every day this week', check: 'Your Stress rating drops by at least 1 point compared with this week.',
    steps: ['Block two 10-minute buffers on your timeline — one mid-shift, one right after your last task — and treat them as fixed.', 'In each buffer, do box breathing: inhale 4 s, hold 4 s, exhale 4 s, hold 4 s, for 4 rounds.', 'Write down the 1–3 things worrying you and, next to each, one concrete next step or the person who can help.', 'If a task is consistently overrunning, raise it with your mission planner early rather than absorbing the extra time.', 'End the day by naming one thing that went well, out loud or in your journal.'] },
  energy: { title: 'Pace your energy across the shift', when: 'Daily for the next 5 days', check: 'Energy ratings back to 3+ and fewer afternoon dips.',
    steps: ['Put your most demanding task in the first 3 hours after waking, when energy is usually highest.', 'Take a 5-minute movement break every 90 minutes (stretch, short resistance set, or move around the module).', 'Eat a protein-containing snack mid-shift and drink water regularly; note whether dips follow skipped meals.', 'Keep your scheduled exercise session, but at moderate intensity on low-energy days rather than skipping it.', 'If a nap is allowed, keep it under 20 minutes and before mid-afternoon.'] },
  mood: { title: 'Schedule activities that lift you', when: 'At least one per day, for a week', check: 'Mood ratings rise and you can name something you enjoyed each day.',
    steps: ['List 5 small things that reliably make you feel better (a song, the cupola view, a photo from home, a hobby, a game with crew).', 'Each morning, choose one and put it on your timeline at a specific time — treat it like a task.', 'Get daylight-like light exposure early in your day (window time or bright lights on).', 'After doing it, rate your mood 1–5 before and after in a short note so you can see what helps most.', 'If low mood continues more than two weeks or feels heavy, consider speaking with your flight surgeon — that is part of normal care.'] },
  connection: { title: 'Plan deliberate connection time', when: 'This week: 2 calls home, 3 shared crew moments', check: 'Connection rating at 3.5+ and isolation lower.',
    steps: ['Book two private calls home this week now, so they are on the timeline rather than left to chance.', 'Before each call, jot down 2–3 things you want to share or ask about, so calls feel meaningful even when short.', 'Suggest one shared crew meal or a short evening activity (film, game, photo session).', 'Send one short message or recorded note to someone at home on days without a call.', 'If something with a crewmate is bothering you, raise it early, privately and specifically.'] },
  cognitive: { title: 'Reduce mental load and protect focus', when: 'Each work block this week', check: 'Concentration ratings 3.5+ and fewer “demanding” days.',
    steps: ['Work in 50-minute focus blocks followed by a 10-minute break away from screens.', 'At the start of each shift, write the top 3 tasks; do the hardest one first.', 'Batch messages and email into 2–3 fixed check times instead of answering continuously.', 'Use checklists for multi-step procedures so you are not holding steps in memory.', 'If two or more days in a row feel overloaded, flag it to your mission planner so tasks can be rebalanced.'] },
};

/** Concrete, step-by-step suggestions grounded in the user's own trends. */
export function buildActionPlans(report: TrendReport, lowerNow: Dimension[]): ActionPlan[] {
  const score = (t: DimTrend) => (lowerNow.includes(t.dimension) ? 2 : 0) + (t.direction === 'declining' ? 1.5 : 0) + (t.last7 !== null && t.last7 < 3 ? 1 : 0) + ((t.volatility ?? 0) >= 1 ? .5 : 0);
  const ranked = report.trends.filter(t => t.direction !== 'unknown' && score(t) > 0).sort((a, b) => score(b) - score(a)).slice(0, 3);
  const plans = ranked.map((t): ActionPlan => {
    const link = report.patterns.find(p => p.kind === 'link' && p.text.toLowerCase().includes(friendly[t.dimension]));
    const why = [`${t.statement}`, lowerNow.includes(t.dimension) ? 'This is below your personal baseline.' : '', link ? `Related pattern: ${link.text}` : ''].filter(Boolean).join(' ');
    return { id: t.dimension, dimension: t.dimension, why, ...library[t.dimension] };
  });
  // Sleep often drives other dimensions: add it if a clear sleep link exists and it isn't already included.
  const sleepLink = report.patterns.find(p => p.kind === 'link' && p.text.startsWith('Your sleep') && p.strength === 'clear');
  if (sleepLink && !plans.some(p => p.id === 'sleep') && plans.length < 3) plans.push({ id: 'sleep', dimension: 'sleep', why: `${sleepLink.text} Improving sleep is likely to help the other areas too.`, ...library.sleep });
  if (!plans.length && report.trends.some(t => t.direction !== 'unknown')) {
    const best = [...report.trends].filter(t => t.last7 !== null).sort((a, b) => b.last7! - a.last7!)[0];
    plans.push({ id: 'maintain', dimension: null, title: 'Keep the routines that are working', why: `Your scores are steady or improving${best ? `; ${friendly[best.dimension]} is your strongest area at ${best.last7!.toFixed(1)}/5` : ''}.`, when: 'Ongoing', check: 'Scores stay within your usual range.',
      steps: ['Write down the 3 habits you think are helping most right now (sleep time, exercise, calls home, etc.).', 'Keep them on your timeline as fixed items so they survive busy weeks.', 'Keep checking in daily so changes are spotted early.', 'Before known busy periods (EVAs, experiments), plan in advance which habits you will protect.'] });
  }
  return plans;
}
