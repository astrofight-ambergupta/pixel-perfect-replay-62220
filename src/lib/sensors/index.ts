import { useEffect, useState } from 'react';

/** Sensor-derived measurements. Real adapters (wearable BLE, HealthKit, spacecraft telemetry) implement SensorSource. */
export type SensorMetric = 'heart' | 'hrv' | 'sleep' | 'activity' | 'temperature' | 'respiration';
export type SensorReading = { at: number; values: Record<SensorMetric, number> };
export interface SensorSource {
  id: string; label: string; simulated: boolean;
  /** Most recent reading, or null if nothing received. */
  latest(): SensorReading | null;
  /** Readings bucketed per hour (range 1 day) or per day. */
  history(days: number): { day: number; values: Record<SensorMetric, number> }[];
  subscribe(listener: (r: SensorReading) => void): () => void;
}
export const sensorMeta: Record<SensorMetric, { label: string; unit: string; decimals: number }> = {
  heart: { label: 'Heart rate', unit: 'bpm', decimals: 0 }, hrv: { label: 'Heart rate variability', unit: 'ms', decimals: 0 },
  sleep: { label: 'Sleep duration', unit: 'hours', decimals: 1 }, activity: { label: 'Activity', unit: 'active min', decimals: 0 },
  temperature: { label: 'Skin temperature', unit: '°C', decimals: 1 }, respiration: { label: 'Respiratory rate', unit: 'breaths/min', decimals: 1 },
};
const base: Record<SensorMetric, [number, number]> = { heart: [66, 6], hrv: [54, 7], sleep: [7.4, .6], activity: [42, 7], temperature: [33.2, .2], respiration: [14, 1] };
function wave(metric: SensorMetric, t: number) { const [b, a] = base[metric]; const k = Object.keys(base).indexOf(metric) + 1; return b + Math.sin(t * .8 / k + k) * a * .7 + Math.sin(t * 3.1 + k) * a * .15; }
function sample(t: number) { return Object.fromEntries((Object.keys(base) as SensorMetric[]).map(m => [m, +wave(m, t).toFixed(sensorMeta[m].decimals)])) as Record<SensorMetric, number>; }

/** Simulated stream for the prototype. Clearly flagged `simulated` so the UI never presents it as a body measurement. */
export class SimulatedSensorSource implements SensorSource {
  id = 'simulated'; label = 'Simulated sensor source'; simulated = true;
  private listeners = new Set<(r: SensorReading) => void>(); private timer: ReturnType<typeof setInterval> | undefined; private last: SensorReading | null = null;
  latest() { return this.last ?? (this.last = { at: Date.now(), values: sample(Date.now() / 3.6e6) }); }
  history(days: number) { const now = Date.now() / 3.6e6; const n = days === 1 ? 24 : days; const step = days === 1 ? 1 : 24; return Array.from({ length: n }, (_, i) => ({ day: i + 1, values: sample(now - (n - 1 - i) * step) })); }
  subscribe(l: (r: SensorReading) => void) {
    this.listeners.add(l);
    if (!this.timer) this.timer = setInterval(() => { this.last = { at: Date.now(), values: sample(Date.now() / 3.6e6 + Math.random() * .05) }; this.listeners.forEach(f => f(this.last!)); }, 4000);
    return () => { this.listeners.delete(l); if (!this.listeners.size && this.timer) { clearInterval(this.timer); this.timer = undefined; } };
  }
}
let active: SensorSource | null = null;
/** Registry: swap in a real adapter with setSensorSource(new WearableSource()). */
export function getSensorSource() { return active ?? (active = new SimulatedSensorSource()); }
export function setSensorSource(s: SensorSource) { active = s; }
export function personalBaseline(source: SensorSource, metric: SensorMetric) {
  const vals = source.history(30).map(h => h.values[metric]); const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  return { mean, low: mean - sd * 1.5, high: mean + sd * 1.5 };
}
/** Live latest reading; null until mounted on the client (avoids hydration mismatch). */
export function useSensorReading() {
  const [r, setR] = useState<SensorReading | null>(null);
  useEffect(() => { const s = getSensorSource(); setR(s.latest()); return s.subscribe(setR); }, []);
  return r;
}
