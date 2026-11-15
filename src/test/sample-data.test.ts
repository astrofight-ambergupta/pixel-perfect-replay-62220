import { describe, it, expect } from 'vitest';
import { sampleMonth } from '@/lib/sample-data';
describe('sample month', () => { it('has 21 official days before today, none today', () => { const m = sampleMonth('2026-11-15'); expect(m).toHaveLength(21); expect(new Set(m.map(e => e.date)).size).toBe(21); expect(m.some(e => e.date === '2026-11-15')).toBe(false); expect(m.every(e => e.kind === 'official')).toBe(true); }); });
