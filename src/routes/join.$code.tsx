import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PENDING_INVITE } from '@/lib/cloud';
import { pageHead } from '@/lib/orbit';
function Page() {
  const { code } = Route.useParams(); const navigate = useNavigate();
  useEffect(() => { localStorage.setItem(PENDING_INVITE, code.toUpperCase().slice(0, 20)); void navigate({ to: '/', replace: true }); }, [code]);
  return <div className="onboard-screen" />;
}
export const Route = createFileRoute('/join/$code')({ head: () => pageHead('Join a workspace', 'Accept your AstraCare workspace invitation.'), component: Page });
