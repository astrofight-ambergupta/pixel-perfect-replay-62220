import { Activity, BatteryMedium, Heart, Moon, Radio, Thermometer, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSensorSource, personalBaseline, sensorMeta, useSensorReading, type SensorMetric } from '@/lib/sensors';
import { OrbitChart } from './orbit-chart';

const cards: { metric: SensorMetric; icon: typeof Heart }[] = [{ metric: 'heart', icon: Heart }, { metric: 'hrv', icon: Activity }, { metric: 'sleep', icon: Moon }, { metric: 'activity', icon: BatteryMedium }, { metric: 'temperature', icon: Thermometer }, { metric: 'respiration', icon: Wind }];
export function Sensors() {
  const [days, setDays] = useState(7); const reading = useSensorReading();
  const [source, setSource] = useState<{ label: string; simulated: boolean } | null>(null);
  const [baselines, setBaselines] = useState<Partial<Record<SensorMetric, ReturnType<typeof personalBaseline>>>>({});
  useEffect(() => { const s = getSensorSource(); setSource({ label: s.label, simulated: s.simulated }); setBaselines(Object.fromEntries(cards.map(c => [c.metric, personalBaseline(s, c.metric)]))); }, []);
  const sim = source?.simulated ?? true;
  return <>
    <div className="page-heading"><div><div className="eyebrow">THE PHYSICAL SIDE OF YOUR JOURNEY</div><h1>Physiological monitoring</h1><p>Context for your wellbeing, not conclusions about your mental health.</p></div><span className="subtle-chip">{sim ? 'Simulated readings' : 'Live readings'}</span></div>
    {sim && <div className="info-banner"><Radio size={18}/><span>These readings come from a simulated sensor source, not a real sensor. They update like a live stream so real wearables can be connected later. Physiological patterns need professional interpretation.</span></div>}
    <div className="section-header"><h2>Your physiological patterns</h2><div className="segmented-tabs">{[{ label: '24 hours', value: 1 }, { label: '7 days', value: 7 }, { label: '30 days', value: 30 }, { label: 'Mission', value: 180 }].map(p => <Button key={p.value} variant={days === p.value ? 'secondary' : 'ghost'} onClick={() => setDays(p.value)}>{p.label}</Button>)}</div></div>
    <div className="sensor-grid">{cards.map(({ metric, icon: Icon }) => { const meta = sensorMeta[metric]; const v = reading?.values[metric]; const b = baselines[metric]; const within = v !== undefined && b ? v >= b.low && v <= b.high : null;
      return <section className="sensor-card" key={metric}><header><h2>{meta.label}</h2><Icon size={20}/></header>
        <strong className="sensor-value">{v !== undefined ? v.toFixed(meta.decimals) : '—'}<small>{meta.unit}</small></strong>
        <p className="sensor-baseline">{b ? `Personal baseline: ${b.low.toFixed(meta.decimals)}–${b.high.toFixed(meta.decimals)} ${meta.unit}` : 'Building baseline…'}</p>
        <OrbitChart metric={metric} days={days} withBaseline/>
        <footer><span>{within === null ? 'Waiting for data' : within ? 'Within your baseline' : 'Outside your usual range'}</span><span>{sim ? 'Simulated · updates every 4 s' : 'Live'}</span></footer></section>; })}</div>
    <div className="sensor-status"><span><Radio size={13} className="inline mr-1"/>{sim ? 'Simulated source · not a real sensor' : `Connected: ${source?.label}`}</span><span>Last reading: {reading ? new Date(reading.at).toLocaleTimeString() : '—'}</span><span>{days === 180 ? 'Entire mission' : days === 1 ? 'Hourly observations' : 'Daily observations'}</span></div>
  </>;
}
