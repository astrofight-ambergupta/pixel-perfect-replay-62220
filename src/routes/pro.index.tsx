import { createFileRoute } from '@tanstack/react-router';
import { ProHome } from '@/components/orbit-pro';
import { useAuthUser, useMemberships } from '@/lib/cloud';
import { pageHead } from '@/lib/orbit';
function Page() { const { user } = useAuthUser(); const { list } = useMemberships(user?.id ?? null); return <ProHome memberships={list} />; }
export const Route = createFileRoute('/pro/')({ head: () => pageHead('Professional workspaces', 'AstraCare healthcare professional dashboard: your authorized crew workspaces.'), component: Page });
