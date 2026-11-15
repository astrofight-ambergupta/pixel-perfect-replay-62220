import { createFileRoute } from '@tanstack/react-router';
import { Insights } from '@/components/orbit-pages';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/insights')({ head: () => pageHead('Personal wellbeing insights', 'AstraCare personal wellbeing insights for an individualized, continuous astronaut wellbeing journey.'), component: Insights });
