import { createFileRoute } from '@tanstack/react-router';
import { Companion } from '@/components/orbit-ai';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/companion')({ head: () => pageHead('AI companion', 'ORBIT’s on-device AI companion: personal baseline, wellbeing summaries, supportive suggestions and pattern memory.'), component: Companion });
