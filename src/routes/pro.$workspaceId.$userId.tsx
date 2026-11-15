import { createFileRoute } from '@tanstack/react-router';
import { ProAstronaut } from '@/components/orbit-pro';
import { pageHead } from '@/lib/orbit';
function Page() { const { workspaceId, userId } = Route.useParams(); return <ProAstronaut key={userId} workspaceId={workspaceId} userId={userId} />; }
export const Route = createFileRoute('/pro/$workspaceId/$userId')({ head: () => pageHead('Astronaut profile', 'AstraCare individual astronaut profile with check-ins, baseline, trends and AI review.'), component: Page });
