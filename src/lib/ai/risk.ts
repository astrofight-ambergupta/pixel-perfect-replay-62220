import type { Risk } from './types';
const severe = [/\b(kill|hurt|harm)(ing)? myself\b/i, /\bsuicid/i, /\bend (it all|my life)\b/i, /\bno reason to (live|go on)\b/i, /\bwant to die\b/i, /\bbetter off without me\b/i];
const concern = [/\bhopeless\b/i, /\bcan'?t cope\b/i, /\bcan'?t sleep\b/i, /\bexhausted\b/i, /\boverwhelm/i, /\balone\b/i, /\bpanic/i, /\bnumb\b/i];
/** Deterministic safety screen. Always runs, whichever AI provider is active, so risk detection never depends on an LLM. */
export function screenText(texts: string[]): { risk: Risk; reason?: string | undefined; concernHits: number } {
  const all = texts.join('\n');
  if (severe.some(r => r.test(all))) return { risk: 'severe', reason: 'Language suggesting a possible immediate safety concern was found in a recent reflection.', concernHits: 0 };
  const hits = concern.filter(r => r.test(all)).length;
  return { risk: hits >= 3 ? 'attention' : 'none', reason: hits >= 3 ? 'Several recent reflections mention strain.' : undefined, concernHits: hits };
}
