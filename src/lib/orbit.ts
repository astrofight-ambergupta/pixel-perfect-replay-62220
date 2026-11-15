import { voiceDbName } from './accounts';
import { useEffect, useState } from 'react';

export type JournalKind = 'official' | 'supplementary';
export type Journal = { id: string; kind?: JournalKind; note?: string; date: string; day: number; createdAt: string; updatedAt: string; ratings: Record<string, number>; reflections: Record<string, string>; revisions: { savedAt: string; ratings: Record<string, number>; reflections: Record<string, string> }[] };
export type VoiceNote = { id: string; date: string; prompt: string; duration: number; phase: string; audio: Blob; transcript?: string; liveTranscript?: string; covered?: string[] };
export const ratingQuestions = [
  ['Mood', 'How would you describe your overall mood today?'],
  ['Stress', 'How would you describe your current stress level?'],
  ['Sleep', 'How well did you sleep?'],
  ['Energy', 'How would you describe your energy levels?'],
  ['Concentration', 'How easy has it been to concentrate today?'],
  ['Connection', 'How connected have you felt to your crewmates?'],
  ['Isolation', 'Have you experienced feelings of isolation or disconnection?'],
  ['Motivation', 'How would you describe your motivation today?'],
] as const;
export const reflectionQuestions = ['What was the most challenging part of today?', 'What was something positive that happened today?', 'Is there anything else you would like to reflect on?'] as const;
export const prompts = {
  'Personal reflection': ['Describe what a normal day looks like for you.', 'What activities make you feel most fulfilled?', 'What do you typically do after a challenging day?', 'What motivates you when you are under pressure?'],
  'Stress & adaptation': ['Describe a recent situation where you experienced significant pressure.', 'How do you respond to unexpected changes?', 'What helps you regain focus after a difficult experience?', 'How do you communicate when you feel overwhelmed?'],
  'Social wellbeing': ['How do you maintain relationships when you are away from people?', 'What makes you feel connected to others?', 'How do you express frustration or disagreement?', 'What helps you feel supported?'],
  'Cognitive functioning': ['How would you describe your normal concentration?', 'When do you feel most mentally alert?', 'How do you respond to mentally demanding tasks?', 'What does mental fatigue feel like for you?'],
} as const;
export function reviseJournal(original: Journal, ratings: Journal['ratings'], reflections: Journal['reflections'], now: string): Journal {
  return { ...original, ratings, reflections, updatedAt: now, revisions: [...original.revisions, { savedAt: original.updatedAt, ratings: original.ratings, reflections: original.reflections }] };
}
export const isOfficial = (e: Journal) => (e.kind ?? 'official') === 'official';
/** One official check-in per date; supplementary notes and revisions of the same entry are always allowed. */
export function canSaveJournal(entries: Journal[], entry: Journal) {
  if (!isOfficial(entry)) return true;
  return !entries.some(e => isOfficial(e) && e.date === entry.date && e.id !== entry.id);
}
export function useJournals() {
  const [entries, setEntries] = useState<Journal[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try { const saved = localStorage.getItem('orbit-journals-v1'); if (saved) setEntries(JSON.parse(saved)); } catch { setError('Your saved journal could not be loaded. Please do not clear this device’s storage.'); }
    setReady(true);
    const sync = () => { try { const saved = localStorage.getItem('orbit-journals-v1'); if (saved) setEntries(JSON.parse(saved)); } catch {} };
    window.addEventListener('orbit-journals-change', sync); return () => window.removeEventListener('orbit-journals-change', sync);
  }, []);
  function save(entry: Journal) {
    if (!canSaveJournal(entries, entry)) { setError('Today’s official check-in is already saved. Add a supplementary note instead.'); return false; }
    const next = [entry, ...entries.filter(e => e.id !== entry.id)].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    try { localStorage.setItem('orbit-journals-v1', JSON.stringify(next)); setEntries(next); window.dispatchEvent(new Event('orbit-journals-change')); return true; }
    catch { setError('This device could not save your entry. Free up storage and try again.'); return false; }
  }
  return { entries, ready, save, error };
}
function openVoiceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(voiceDbName(), 1);
    request.onupgradeneeded = () => request.result.createObjectStore('notes', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function getVoiceNotes(): Promise<VoiceNote[]> {
  const db = await openVoiceDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction('notes', 'readonly'); const req = tx.objectStore('notes').getAll(); req.onsuccess = () => resolve(req.result.sort((a: VoiceNote, b: VoiceNote) => b.date.localeCompare(a.date))); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); });
}
export async function saveVoiceNote(note: VoiceNote) {
  const db = await openVoiceDatabase();
  return new Promise<void>((resolve, reject) => { const tx = db.transaction('notes', 'readwrite'); tx.objectStore('notes').put(note); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); });
}
export function sensorObservations(days: number) { return Array.from({ length: days === 1 ? 24 : days }, (_, i) => ({ day: i + 1, sleep: +(7.4 + Math.sin(i * .8) * .7).toFixed(1), mood: +(3.8 + Math.sin(i * .55) * .4).toFixed(1), energy: +(3.6 + Math.cos(i * .6) * .5).toFixed(1), heart: Math.round(63 + Math.sin(i * .7) * 7), hrv: Math.round(52 + Math.cos(i * .6) * 8), activity: Math.round(42 + Math.sin(i * .4) * 7), temperature: +(33.2 + Math.sin(i * .7) * .2).toFixed(1), respiration: +(14 + Math.cos(i * .8)).toFixed(1) })); }
export const chartData = sensorObservations(30);
export const MISSION_LENGTH = 180;
function storedMissionStart() { try { return (JSON.parse(localStorage.getItem('orbit-profile-v1') || 'null') as { missionStart?: string } | null)?.missionStart ?? ''; } catch { return ''; } }
/** Days relative to launch: negative before launch, launch day = 1, no day 0. */
export function missionDayFrom(start: string, date: string) { if (!start) return 0; const diff = Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000); return diff >= 0 ? diff + 1 : diff; }
export function missionDay(date = todayDate(), start = storedMissionStart()) { return missionDayFrom(start, date); }
export function formatMissionDay(d: number) { return d < 0 ? `T−${-d}` : String(d); }
/** One voice reflection per local date. */
export function localDate(iso: string) { return todayDate(undefined, new Date(iso)); }
export function canSaveVoiceNote(notes: { date: string }[], date = todayDate()) { return !notes.some(n => localDate(n.date) === date); }
export function formatDate(date: string) { return new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
export function deviceTimeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } }
export function isValidTimeZone(tz: string) { try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return !!tz; } catch { return false; } }
function storedTimeZone() { try { const tz = (JSON.parse(localStorage.getItem('orbit-profile-v1') || 'null') as { timeZone?: string } | null)?.timeZone; return tz && isValidTimeZone(tz) ? tz : deviceTimeZone(); } catch { return deviceTimeZone(); } }
/** Today's date (YYYY-MM-DD) in the profile's chosen time zone; works offline via built-in Intl data. */
export function todayDate(timeZone?: string, now = new Date()) { const tz = timeZone ?? (typeof localStorage === 'undefined' ? deviceTimeZone() : storedTimeZone()); return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
/** Live "today" that updates at midnight, on wake/focus and on profile changes. */
export function useToday() {
  const [today, setToday] = useState('');
  useEffect(() => { const u = () => setToday(todayDate()); u(); const id = setInterval(u, 30000); const vis = () => document.visibilityState === 'visible' && u();
    document.addEventListener('visibilitychange', vis); window.addEventListener('focus', u); window.addEventListener('orbit-profile-change', u);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); window.removeEventListener('focus', u); window.removeEventListener('orbit-profile-change', u); }; }, []);
  return today;
}
export function pageHead(title: string, description: string) { return { meta: [{ title: `${title} · AstraCare` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · AstraCare` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }; }