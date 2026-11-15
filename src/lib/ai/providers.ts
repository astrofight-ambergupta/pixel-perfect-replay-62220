import { ruleBasedAnalysis, type AnalysisInput } from './fallback';
import { localChat, isModelCached, webGpuAvailable } from './llm';
import { retrieveRelated } from './memory';
import type { Analysis } from './types';

/** Swappable analysis back ends. Add a server/cloud provider here later without touching the UI. */
export interface AnalysisProvider {
  id: string; label: string; kind: 'on-device-llm' | 'rules' | 'remote';
  available(): Promise<boolean>;
  analyze(input: AnalysisInput): Promise<Analysis>;
  chat?(question: string, context: string): Promise<string>;
}
const SYSTEM = `You are ORBIT, a supportive wellbeing companion for an astronaut. Never diagnose, never name mental health conditions, never use alarming labels. Offer gentle, optional suggestions that respect the astronaut's autonomy. Say clearly when information is limited. Keep replies short and warm.`;

export const rulesProvider: AnalysisProvider = { id: 'rules', label: 'On-device pattern analysis', kind: 'rules', available: async () => true, analyze: async i => ruleBasedAnalysis(i) };

export const localLlmProvider: AnalysisProvider = {
  id: 'local-llm', label: 'On-device AI (Llama 3.2 1B)', kind: 'on-device-llm',
  available: async () => webGpuAvailable() && await isModelCached(),
  async analyze(input) {
    // Evidence, confidence, insufficient-data and risk always come from the deterministic layer; the LLM only phrases it.
    const base = ruleBasedAnalysis(input, { id: this.id, label: this.label });
    const lowDims = base.dimensions.filter(d => d.trend === 'lower').map(d => d.dimension);
    const related = retrieveRelated(input.entries, lowDims, input.baseline, input.today);
    const recent = input.entries.slice(0, 7).map(e => `${e.date} ${e.kind ?? 'official'}: ${e.note ?? Object.values(e.reflections).filter(Boolean).join(' / ')}`).join('\n');
    const voice = input.voice.filter(v => v.transcript).slice(0, 5).map(v => `${v.date.slice(0, 10)}: ${v.transcript}`).join('\n');
    const prompt = `Patterns compared to personal baseline (from self-reports, not measured):\n${base.dimensions.map(d => `${d.dimension}: ${d.insufficientData ? 'insufficient data' : `${d.trend} (delta ${d.delta})`}`).join('\n')}\nRecent written reflections:\n${recent || 'none'}\nVoice transcripts:\n${voice || 'none'}\nSimilar past days:\n${related.map(r => r.date).join(', ') || 'none'}\nReturn JSON {"summary": string (max 2 sentences), "recommendations": string[] (2-3 optional suggestions), "notes": {"sleep"?: string, "stress"?: string, "energy"?: string, "mood"?: string, "connection"?: string, "cognitive"?: string} (max 10 words each, only for dimensions with data)}.`;
    try {
      const raw = await localChat([{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], true);
      const j = JSON.parse(raw) as { summary?: string; recommendations?: string[]; notes?: Record<string, string> };
      return { ...base,
        summary: typeof j.summary === 'string' && j.summary ? j.summary : base.summary,
        recommendations: Array.isArray(j.recommendations) && j.recommendations.length ? j.recommendations.slice(0, 3).map(String) : base.recommendations,
        dimensions: base.dimensions.map(d => !d.insufficientData && j.notes?.[d.dimension] ? { ...d, note: String(j.notes[d.dimension]), sources: [...d.sources, 'ai_inference' as const] } : d) };
    } catch { return { ...base, providerLabel: `${this.label} (fell back to pattern analysis)` }; }
  },
  async chat(question, context) { return localChat([{ role: 'system', content: `${SYSTEM}\nContext about the astronaut's recent patterns:\n${context}` }, { role: 'user', content: question }]); },
};
export const remoteProvider: AnalysisProvider = { id: 'remote', label: 'Mission ground service (not configured)', kind: 'remote', available: async () => false, analyze: async i => ruleBasedAnalysis(i) };
export const providers = [localLlmProvider, rulesProvider, remoteProvider];
export function preferredProviderId() { try { return localStorage.getItem('orbit-ai-provider') || 'local-llm'; } catch { return 'local-llm'; } }
export function setPreferredProvider(id: string) { try { localStorage.setItem('orbit-ai-provider', id); } catch {} window.dispatchEvent(new Event('orbit-ai-refresh')); }
