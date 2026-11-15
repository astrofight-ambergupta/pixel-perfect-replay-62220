import { createFileRoute } from '@tanstack/react-router';
import { Sensors } from '@/components/orbit-sensors';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/sensors')({ head: () => pageHead('Physiological monitoring', 'AstraCare physiological monitoring for an individualized, continuous astronaut wellbeing journey.'), component: Sensors });
