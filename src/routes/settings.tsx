import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '@/components/orbit-pages';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/settings')({ head: () => pageHead('Settings and privacy', 'ORBIT settings and privacy for an individualized, continuous astronaut wellbeing journey.'), component: Settings });
