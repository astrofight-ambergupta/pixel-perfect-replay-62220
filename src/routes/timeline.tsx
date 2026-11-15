import { createFileRoute } from '@tanstack/react-router';
import { Timeline } from '@/components/orbit-pages';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/timeline')({ head: () => pageHead('Mission timeline', 'ORBIT mission timeline for an individualized, continuous astronaut wellbeing journey.'), component: Timeline });
