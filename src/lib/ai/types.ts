export type Dimension = 'sleep' | 'stress' | 'energy' | 'mood' | 'connection' | 'cognitive';
export type DataSource = 'self_report' | 'sensor' | 'ai_inference';
export type Confidence = 'low' | 'moderate' | 'good';
export type DimensionResult = {
  dimension: Dimension; word: string; note: string;
  trend: 'higher' | 'usual' | 'lower' | null; confidence: Confidence | null;
  sources: DataSource[]; insufficientData: boolean; delta: number | null;
};
export type Risk = 'none' | 'attention' | 'severe';
export type Analysis = {
  date: string; generatedAt: string; providerId: string; providerLabel: string;
  dimensions: DimensionResult[]; summary: string; recommendations: string[];
  attention: boolean; risk: Risk; riskReason?: string | undefined; dataUsed: { checkIns: number; notes: number; transcripts: number; sensorDays: number };
};
export const dimensionLabels: Record<Dimension, string> = { sleep: 'Sleep quality', stress: 'Stress level', energy: 'Energy', mood: 'Mood', connection: 'Connection', cognitive: 'Cognitive load' };
export const sourceLabels: Record<DataSource, string> = { self_report: 'You reported', sensor: 'Measured (simulated)', ai_inference: 'AI interpretation' };
