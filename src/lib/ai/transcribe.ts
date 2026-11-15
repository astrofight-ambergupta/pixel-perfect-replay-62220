/* On-device speech-to-text (Whisper tiny, ~40 MB, cached by the browser after first use). */
type Asr = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;
let asr: Promise<Asr> | null = null;
async function getAsr() {
  return asr ??= import('@huggingface/transformers').then(async t => (await t.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en')) as unknown as Asr).catch(e => { asr = null; throw e; });
}
async function decode(blob: Blob) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try { const buf = await ctx.decodeAudioData(await blob.arrayBuffer()); return buf.getChannelData(0); } finally { void ctx.close(); }
}
export async function transcribe(blob: Blob) {
  const [run, audio] = await Promise.all([getAsr(), decode(blob)]);
  const out = await run(audio); return (Array.isArray(out) ? out.map(o => o.text).join(' ') : out.text).trim();
}
