import { supabase } from '@/integrations/supabase/client';
import { getVoiceNotes, type Journal } from './orbit';
import { loadEscalation } from './ai/escalation';

const LAST = 'orbit-last-sync';
export const SYNC_EVENT = 'astracare-sync';
export type SyncRecord = { kind: 'checkin' | 'note' | 'voice' | 'profile'; local_id: string; record_date: string | null; payload: unknown };

/** Pure: turns on-device data into upload rows. Audio stays on the device; transcripts and topic coverage are shared. */
export function buildRecords(journals: Journal[], voice: { id: string; date: string; prompt: string; duration: number; transcript?: string; liveTranscript?: string; covered?: string[] }[], profile: unknown): SyncRecord[] {
  return [
    ...journals.map(j => ({ kind: ((j.kind ?? 'official') === 'official' ? 'checkin' : 'note') as 'checkin' | 'note', local_id: j.id, record_date: j.date, payload: j })),
    ...voice.map(v => ({ kind: 'voice' as const, local_id: v.id, record_date: v.date.slice(0, 10), payload: { id: v.id, date: v.date, prompt: v.prompt, duration: v.duration, transcript: v.transcript || v.liveTranscript || '', covered: v.covered ?? [] } })),
    ...(profile ? [{ kind: 'profile' as const, local_id: 'profile', record_date: null, payload: profile }] : []),
  ];
}
export function lastSync() { try { return localStorage.getItem(LAST); } catch { return null; } }

/** Uploads everything on this device to each workspace where the user is an astronaut. Idempotent (upsert by local id). */
export async function syncNow(userId: string, workspaceIds: string[]) {
  if (!navigator.onLine) throw new Error('You’re offline. Your entries are safe on this device and will be shared when you reconnect.');
  if (!workspaceIds.length) return 0;
  let journals: Journal[] = []; let profile: unknown = null;
  try { journals = JSON.parse(localStorage.getItem('orbit-journals-v1') || '[]'); profile = JSON.parse(localStorage.getItem('orbit-profile-v1') || 'null'); } catch {}
  const voice = await getVoiceNotes().catch(() => []);
  const records = buildRecords(journals, voice, profile);
  for (const ws of workspaceIds) {
    if (records.length) {
      const { error } = await supabase.from('health_records').upsert(records.map(r => ({ ...r, payload: r.payload as never, workspace_id: ws, user_id: userId, synced_at: new Date().toISOString() })), { onConflict: 'workspace_id,user_id,kind,local_id' });
      if (error) throw new Error('Sharing didn’t finish. Your entries are still safe on this device.');
    }
    const esc = loadEscalation();
    const sentKey = `orbit-alert-sent-${ws}-${esc.flaggedAt}`;
    if (esc.stage !== 'none' && esc.flaggedAt && !localStorage.getItem(sentKey)) {
      const { error } = await supabase.from('alerts').insert({ workspace_id: ws, user_id: userId, level: 'severe', reason: esc.reason ?? 'Safety screen flagged a concern.' });
      if (!error) localStorage.setItem(sentKey, '1');
    }
    await supabase.from('sync_requests').update({ fulfilled_at: new Date().toISOString() }).eq('user_id', userId).eq('workspace_id', ws).is('fulfilled_at', null);
  }
  localStorage.setItem(LAST, new Date().toISOString());
  window.dispatchEvent(new Event(SYNC_EVENT));
  return records.length;
}
export async function pendingSyncRequests(userId: string) {
  const { data } = await supabase.from('sync_requests').select('id, workspace_id, created_at').eq('user_id', userId).is('fulfilled_at', null);
  return data ?? [];
}
