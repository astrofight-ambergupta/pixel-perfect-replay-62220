export const voiceTopics = [
  { id: 'personal', label: 'Personal reflection', hint: 'your day, what fulfils you, what motivates you', words: ['day', 'today', 'routine', 'morning', 'fulfil', 'enjoy', 'motivat', 'feel', 'myself', 'normal', 'activity', 'activities', 'hobby', 'proud'] },
  { id: 'stress', label: 'Stress & adaptation', hint: 'pressure, changes, regaining focus', words: ['stress', 'pressure', 'overwhelm', 'difficult', 'hard', 'challeng', 'change', 'unexpected', 'cope', 'calm', 'anxious', 'worr', 'tense', 'problem'] },
  { id: 'social', label: 'Social wellbeing', hint: 'crew, family, feeling connected or supported', words: ['crew', 'team', 'family', 'friend', 'home', 'talk', 'call', 'connect', 'support', 'together', 'lonely', 'alone', 'isolat', 'people', 'wife', 'husband', 'kids', 'partner'] },
  { id: 'cognitive', label: 'Cognitive functioning', hint: 'concentration, alertness, mental fatigue', words: ['focus', 'concentrat', 'alert', 'tired', 'fatigue', 'think', 'mental', 'memory', 'forget', 'attention', 'sharp', 'foggy', 'distract', 'task'] },
] as const;
export type TopicId = typeof voiceTopics[number]['id'];
/** A topic counts as covered once at least two distinct cue words are spoken. */
export function promptCoverage(transcript: string): Record<TopicId, boolean> {
  const words = transcript.toLowerCase().split(/[^a-z']+/).filter(Boolean);
  return Object.fromEntries(voiceTopics.map(t => [t.id, new Set(t.words.filter(w => words.some(x => x.startsWith(w)))).size >= 2])) as Record<TopicId, boolean>;
}
