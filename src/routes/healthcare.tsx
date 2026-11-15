import { createFileRoute } from '@tanstack/react-router';
import { Healthcare } from '@/components/orbit-pages';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/healthcare')({ head: () => pageHead('Restricted healthcare access', 'ORBIT restricted healthcare access for an individualized, continuous astronaut wellbeing journey.'), component: Healthcare });
