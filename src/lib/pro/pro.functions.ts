import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assessRecords, type ProRecord } from './analysis';

const uuid = (v: unknown) => { if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error('Invalid id'); return v; };
const today = () => new Date().toISOString().slice(0, 10);

async function assertProfessional(supabase: any, ws: string, userId: string) {
  const { data } = await supabase.from('workspace_members').select('role').eq('workspace_id', ws).eq('user_id', userId).eq('role', 'professional').maybeSingle();
  if (!data) throw new Response('Forbidden', { status: 403 });
}

export const getWorkspaceOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((i: { workspaceId: string }) => ({ workspaceId: uuid(i.workspaceId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertProfessional(supabase, data.workspaceId, userId);
    const [ws, members, records, alerts, invites, log, syncs] = await Promise.all([
      supabase.from('workspaces').select('*').eq('id', data.workspaceId).single(),
      supabase.from('workspace_members').select('user_id, role, display_name, joined_at').eq('workspace_id', data.workspaceId),
      supabase.from('health_records').select('user_id, kind, local_id, record_date, payload, synced_at').eq('workspace_id', data.workspaceId).limit(5000),
      supabase.from('alerts').select('*').eq('workspace_id', data.workspaceId).order('created_at', { ascending: false }).limit(100),
      supabase.from('workspace_invites').select('id, code_hint, role, expires_at, revoked, uses, created_at').eq('workspace_id', data.workspaceId).order('created_at', { ascending: false }),
      supabase.from('access_log').select('actor_id, subject_user_id, action, created_at').eq('workspace_id', data.workspaceId).order('created_at', { ascending: false }).limit(50),
      supabase.from('sync_requests').select('user_id, created_at, fulfilled_at').eq('workspace_id', data.workspaceId).order('created_at', { ascending: false }).limit(100),
    ]);
    await supabase.from('access_log').insert({ workspace_id: data.workspaceId, actor_id: userId, action: 'viewed workspace overview' });
    const all = (records.data ?? []) as (ProRecord & { user_id: string })[];
    const astronauts = (members.data ?? []).filter(m => m.role === 'astronaut').map(m => {
      const recs = all.filter(r => r.user_id === m.user_id);
      const profile = recs.find(r => r.kind === 'profile')?.payload as { name?: string } | undefined;
      const a = assessRecords(recs, today());
      const lastReq = (syncs.data ?? []).find(s => s.user_id === m.user_id);
      return { userId: m.user_id, name: profile?.name || m.display_name || 'Unnamed astronaut', joinedAt: m.joined_at, risk: a.risk, riskReason: a.riskReason, lastCheckIn: a.lastCheckIn, lastSynced: a.lastSynced, checkIns: a.checkIns, biggestDelta: Math.min(0, ...a.deviations.map(d => d.delta ?? 0)), openAlerts: (alerts.data ?? []).filter(x => x.user_id === m.user_id && x.status === 'open').length, pendingSync: !!lastReq && !lastReq.fulfilled_at };
    });
    return { workspace: ws.data, isOwner: ws.data?.owner_id === userId, members: members.data ?? [], astronauts, alerts: alerts.data ?? [], invites: invites.data ?? [], log: log.data ?? [] };
  });

export const getAstronautDetail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((i: { workspaceId: string; userId: string }) => ({ workspaceId: uuid(i.workspaceId), userId: uuid(i.userId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertProfessional(supabase, data.workspaceId, userId);
    const [records, alerts, member] = await Promise.all([
      supabase.from('health_records').select('kind, local_id, record_date, payload, synced_at').eq('workspace_id', data.workspaceId).eq('user_id', data.userId).order('record_date', { ascending: false }),
      supabase.from('alerts').select('*').eq('workspace_id', data.workspaceId).eq('user_id', data.userId).order('created_at', { ascending: false }),
      supabase.from('workspace_members').select('display_name, joined_at').eq('workspace_id', data.workspaceId).eq('user_id', data.userId).eq('role', 'astronaut').maybeSingle(),
    ]);
    if (!member.data) throw new Response('Not found', { status: 404 });
    await supabase.from('access_log').insert({ workspace_id: data.workspaceId, actor_id: userId, subject_user_id: data.userId, action: 'viewed astronaut profile' });
    const recs = (records.data ?? []) as ProRecord[];
    return { member: member.data, records: recs, alerts: alerts.data ?? [], assessment: assessRecords(recs, today()) };
  });

export const professionalAiReview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((i: { workspaceId: string; userId: string; question?: string }) => ({ workspaceId: uuid(i.workspaceId), userId: uuid(i.userId), question: typeof i.question === 'string' ? i.question.slice(0, 1000) : '' }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertProfessional(supabase, data.workspaceId, userId);
    const { data: rows } = await supabase.from('health_records').select('kind, local_id, record_date, payload, synced_at').eq('workspace_id', data.workspaceId).eq('user_id', data.userId).order('record_date', { ascending: false }).limit(60);
    await supabase.from('access_log').insert({ workspace_id: data.workspaceId, actor_id: userId, subject_user_id: data.userId, action: 'requested professional AI review' });
    const recs = (rows ?? []) as ProRecord[];
    const assessment = assessRecords(recs, today());
    const evidence = recs.filter(r => r.kind !== 'profile').slice(0, 30).map(r => ({ kind: r.kind, date: r.record_date, data: r.payload }));
    const { generateResponse, GatewayError, PaymentRequiredError } = await import('@lovable.dev/ai-gateway');
    try {
      const res = await generateResponse({
        model: 'openai/gpt-6-astra',
        instructions: 'You support a licensed healthcare professional reviewing an astronaut\'s self-reported wellbeing data. Give a full, unfiltered analytical review: abnormalities, deviations from the individual baseline, patterns across check-ins, relevant historical comparisons, and the evidence (quote dates and entries). Label every statement as MEASURED (raw self-report values), CALCULATED (from the deterministic assessment provided), AI INTERPRETATION, or MISSING. The deterministic risk level and confidence are authoritative: never raise or lower them, and never state uncertain conclusions as fact. Discuss limitations, missing data and possible false positives/negatives. Never suppress a concerning finding. This is decision support, not a diagnosis. Use short markdown headings and bullet points.',
        input: JSON.stringify({ question: data.question || 'Provide a full review.', deterministicAssessment: assessment, records: evidence }),
      });
      const out = (res as { output?: { type: string; content?: { type: string; text?: string }[] }[] }).output ?? [];
      const text = out.flatMap(o => o.type === 'message' ? (o.content ?? []).filter(c => c.type === 'output_text').map(c => c.text ?? '') : []).join('\n').trim();
      return { ok: true as const, text: text || 'The AI returned no text.', assessment };
    } catch (e) {
      if (e instanceof GatewayError) return { ok: false as const, text: e instanceof PaymentRequiredError ? 'AI credits are used up. Add credits to continue reviews.' : 'The AI review could not be completed. The calculated assessment below is still valid.', assessment };
      throw e;
    }
  });
