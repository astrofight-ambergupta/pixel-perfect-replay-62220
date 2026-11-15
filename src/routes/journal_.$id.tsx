import { createFileRoute } from '@tanstack/react-router';
import { JournalDetail } from '@/components/orbit-journal';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/journal_/$id')({ head: () => pageHead('Journal reflection', 'Your private ORBIT journal reflection and longitudinal record.'), component: Detail });
function Detail() { const { id } = Route.useParams(); return <JournalDetail id={id}/>; }
