import { createFileRoute } from '@tanstack/react-router';
import { Sensors } from '@/components/orbit-pages';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/sensors')({ head: () => pageHead('Physiological monitoring', 'ORBIT physiological monitoring for an individualized, continuous astronaut wellbeing journey.'), component: Sensors });
