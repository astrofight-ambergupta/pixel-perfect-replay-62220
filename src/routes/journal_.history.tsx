import { createFileRoute } from '@tanstack/react-router';
import { JournalHistory } from '@/components/orbit-journal';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/journal_/history')({ head: () => pageHead('Journal history', 'ORBIT journal history for an individualized, continuous astronaut wellbeing journey.'), component: JournalHistory });
