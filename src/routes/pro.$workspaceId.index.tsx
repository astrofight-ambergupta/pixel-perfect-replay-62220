import { createFileRoute } from '@tanstack/react-router';
import { ProWorkspace } from '@/components/orbit-pro';
import { pageHead } from '@/lib/orbit';
function Page() { const { workspaceId } = Route.useParams(); return <ProWorkspace key={workspaceId} workspaceId={workspaceId} />; }
export const Route = createFileRoute('/pro/$workspaceId/')({ head: () => pageHead('Workspace overview', 'AstraCare workspace overview: crew risk levels, alerts, trends and invitations.'), component: Page });
