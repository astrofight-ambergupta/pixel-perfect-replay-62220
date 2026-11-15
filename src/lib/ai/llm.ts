/* On-device LLM via WebLLM (WebGPU). Loaded lazily in the browser only; weights are cached by the browser for offline use. */
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
const webLlm = () => import.meta.env.SSR ? Promise.reject(new Error('browser only')) : import('@mlc-ai/web-llm');
export const LOCAL_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
export type LlmStatus = { state: 'idle' | 'unsupported' | 'downloading' | 'ready' | 'error'; progress: number; text: string };
let engine: MLCEngineInterface | null = null; let loading: Promise<MLCEngineInterface> | null = null;
let status: LlmStatus = { state: 'idle', progress: 0, text: '' }; const listeners = new Set<(s: LlmStatus) => void>();
function set(s: Partial<LlmStatus>) { status = { ...status, ...s }; listeners.forEach(l => l(status)); }
export const getLlmStatus = () => status;
export function onLlmStatus(l: (s: LlmStatus) => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export const webGpuAvailable = () => typeof navigator !== 'undefined' && 'gpu' in navigator;
export async function isModelCached() { if (!webGpuAvailable()) return false; try { const m = await webLlm(); return await m.hasModelInCache(LOCAL_MODEL); } catch { return false; } }
export async function loadLocalModel() {
  if (engine) return engine; if (loading) return loading;
  if (!webGpuAvailable()) { set({ state: 'unsupported', text: 'This device or browser can’t run the on-device AI model.' }); throw new Error('unsupported'); }
  set({ state: 'downloading', progress: 0, text: 'Preparing…' });
  loading = webLlm().then(m => m.CreateMLCEngine(LOCAL_MODEL, { initProgressCallback: p => set({ progress: p.progress, text: p.text }) }))
    .then(e => { engine = e; set({ state: 'ready', progress: 1, text: 'Ready offline' }); return e; })
    .catch(err => { loading = null; set({ state: 'error', text: 'The AI model couldn’t be prepared. Check storage space and try again.' }); throw err; });
  return loading;
}
export async function localChat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], json = false) {
  const e = await loadLocalModel();
  const r = await e.chat.completions.create({ messages, temperature: .3, max_tokens: 700, ...(json ? { response_format: { type: 'json_object' as const } } : {}) });
  return r.choices[0]?.message?.content ?? '';
}
