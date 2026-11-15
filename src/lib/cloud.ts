import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type Membership = { workspace_id: string; role: 'astronaut' | 'professional'; workspace: { id: string; name: string; owner_id: string } | null };
export type View = 'astronaut' | 'professional';
const VIEW_KEY = 'astracare-view';
export const CLOUD_EVENT = 'astracare-cloud-change';
export const PENDING_INVITE = 'astracare-pending-invite';

export function useAuthUser() {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: false, user: null });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      setState({ ready: true, user: session?.user ?? null });
    });
    supabase.auth.getSession().then(({ data: { session } }) => setState({ ready: true, user: session?.user ?? null }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

const MEM_CACHE = 'astracare-memberships';
/** Memberships are cached on the device so astronauts can open the app offline. Access to data is enforced by the database, not this cache. */
export function useMemberships(userId: string | null) {
  const [state, setState] = useState<{ ready: boolean; list: Membership[] }>({ ready: false, list: [] });
  useEffect(() => {
    if (!userId) { setState({ ready: true, list: [] }); return; }
    let alive = true;
    const load = async () => {
      try { const c = JSON.parse(localStorage.getItem(`${MEM_CACHE}-${userId}`) || 'null'); if (c && alive) setState({ ready: true, list: c }); } catch {}
      const { data, error } = await supabase.from('workspace_members').select('workspace_id, role, workspace:workspaces(id, name, owner_id)').eq('user_id', userId);
      if (!alive) return;
      if (error) { setState(s => ({ ...s, ready: true })); return; }
      const list = (data ?? []) as unknown as Membership[];
      try { localStorage.setItem(`${MEM_CACHE}-${userId}`, JSON.stringify(list)); } catch {}
      setState({ ready: true, list });
    };
    void load();
    window.addEventListener(CLOUD_EVENT, load);
    return () => { alive = false; window.removeEventListener(CLOUD_EVENT, load); };
  }, [userId]);
  return state;
}
export const refreshCloud = () => window.dispatchEvent(new Event(CLOUD_EVENT));
export function getView(): View | null { try { return localStorage.getItem(VIEW_KEY) as View | null; } catch { return null; } }
export function setView(v: View) { try { localStorage.setItem(VIEW_KEY, v); } catch {} refreshCloud(); }
/** Pure: which view to show. A view switch never changes data access — the database decides that per workspace. */
export function resolveView(list: Membership[], preferred: View | null, path: string): View | null {
  const a = list.some(m => m.role === 'astronaut'); const p = list.some(m => m.role === 'professional');
  if (!a && !p) return null;
  if (path.startsWith('/pro')) return p ? 'professional' : 'astronaut';
  if (a && p) return preferred ?? 'astronaut';
  return a ? 'astronaut' : 'professional';
}
export async function cloudSignOut() { await supabase.auth.signOut(); }
