import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { BrandMark } from '@/components/orbit-auth';
import { pageHead } from '@/lib/orbit';
function Page() {
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState(''); const navigate = useNavigate();
  return <div className="onboard-screen"><section className="onboard-card"><BrandMark /><h1>Choose a new password</h1>
    <form className="onboard-form" onSubmit={async e => { e.preventDefault(); const { error } = await supabase.auth.updateUser({ password: pw }); if (error) setMsg('The link may have expired. Request a new one.'); else void navigate({ to: '/' }); }}>
      <div className="onboard-field"><Label htmlFor="r-pw">New password</Label><Input id="r-pw" type="password" minLength={8} value={pw} onChange={e => setPw(e.target.value)} /></div>
      {msg && <small role="alert">{msg}</small>}<Button type="submit" disabled={pw.length < 8}>Save password</Button></form></section></div>;
}
export const Route = createFileRoute('/reset-password')({ head: () => pageHead('Reset password', 'Set a new AstraCare password.'), component: Page });
