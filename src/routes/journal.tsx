import { createFileRoute } from '@tanstack/react-router';
import { JournalForm } from '@/components/orbit-journal';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/journal')({ head: () => pageHead('Daily journal', 'ORBIT daily journal for an individualized, continuous astronaut wellbeing journey.'), component: JournalForm });
