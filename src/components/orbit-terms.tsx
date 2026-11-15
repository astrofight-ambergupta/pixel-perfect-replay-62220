import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, FileText, Orbit, ShieldCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CONSENT_EVENT, TERMS_VERSION, acceptConsent, canAccept, escalationReadiness, loadConsent, withdrawSharing, type Consent } from '@/lib/consent';

const sections: [string, string[]][] = [
  ['1. Purpose of AstraCare', ['AstraCare supports astronaut wellbeing through daily check-ins, voice reflections and physiological readings.', 'AstraCare uses AI to compare mental-health indicators against your own personalized baseline, built from your earlier check-ins, rather than against a population average.']],
  ['2. Information collected', ['Journal check-ins, voice reflections and their transcripts, self-reported ratings, profile details (name, birth date, gender, mission dates, time zone) and available sensor readings.']],
  ['3. Where your information is stored', ['In this prototype everything, including these consent records, stays on this device inside your account. It is not encrypted mission-grade storage. Secure synchronization is planned for production.']],
  ['4. Limits of AI', ['AI-generated classifications and suggestions are not medical diagnoses and do not replace a qualified professional.', 'AstraCare cannot guarantee immediate professional intervention. If you need help now, contact your crew or flight surgeon through your mission channel.']],
  ['5. Your rights', ['You can review these terms at any time, export your journals, withdraw healthcare data-sharing consent in Settings, and delete your account and its data.']],
  ['6. Changes to these terms', [`This is version ${TERMS_VERSION}. If the terms change materially, you will be asked to review and accept the new version before continuing.`]],
];

export function TermsDocument() {
  return <div className="terms-doc">
    <Accordion type="multiple" defaultValue={['1. Purpose of AstraCare']}>{sections.map(([t, ps]) => <AccordionItem key={t} value={t}><AccordionTrigger>{t}</AccordionTrigger><AccordionContent>{ps.map(p => <p key={p}>{p}</p>)}</AccordionContent></AccordionItem>)}</Accordion>
    <section className="terms-risk" aria-labelledby="risk-h"><div className="terms-risk-head"><AlertTriangle size={20} /><h3 id="risk-h">Mandatory risk escalation agreement</h3></div>
      <p>AstraCare's AI uses three classifications against your personal baseline:</p>
      <ul className="terms-tiers"><li><strong>Low risk</strong> Indicators are relatively consistent with your baseline.</li><li><strong>Moderate risk</strong> Meaningful deviations were detected and need more monitoring.</li><li><strong>High risk</strong> Significant deviations were detected, which starts the professional escalation protocol.</li></ul>
      <p>When a high-risk classification is detected:</p>
      <ol><li>The AI immediately suspends personalized mental-health advice and recommendations.</li><li>The system sends a notification to your designated healthcare professional, only if the required consent and connection are in place.</li><li>Relevant information (risk classification, baseline deviation, historical trends and relevant check-in information) is transmitted securely.</li><li>The healthcare professional reviews the information and decides the next steps.</li><li>AI-generated personalized feedback stays suspended until the approved safety conditions for reactivation are met. A failed notification never reactivates it.</li></ol>
      <p className="terms-note">AI classifications are not medical diagnoses. AstraCare cannot guarantee immediate professional intervention.</p>
    </section>
  </div>;
}

function SharingConsentBox() {
  return <section className="terms-sharing" aria-labelledby="share-h"><div className="terms-risk-head"><ShieldCheck size={20} /><h3 id="share-h">Healthcare data-sharing consent</h3></div>
    <dl><dt>What may be shared</dt><dd>Your risk classification, baseline deviation, historical trends and relevant check-in content.</dd>
      <dt>Why</dt><dd>So a qualified professional can review a high-risk classification and decide next steps.</dd>
      <dt>Who receives it</dt><dd>Your designated healthcare professional or organization. <em>Not yet designated on this device.</em> Nothing is sent until one is set up.</dd>
      <dt>How it's protected</dt><dd>Only through a secure, authorized channel, and only when a high-risk classification occurs. No channel is connected in this prototype.</dd>
      <dt>Withdrawing consent</dt><dd>You can withdraw at any time in Settings, subject to applicable legal requirements. Monitoring requires this consent, so you'll be asked again on your next sign-in.</dd></dl>
  </section>;
}

export function TermsScreen() {
  const [terms, setTerms] = useState(false); const [share, setShare] = useState(false); const [review, setReview] = useState(false);
  return <div className="onboard-screen"><section className="onboard-card terms-card">
    <div className="onboard-brand"><Orbit size={40} strokeWidth={1.4} /><div><strong>AstraCare</strong><span>Terms & Conditions · Version {TERMS_VERSION}</span></div></div>
    <h1>Before you begin</h1><p>Please read how AstraCare monitors your wellbeing and what happens if your baseline indicates high risk.</p>
    <div className="terms-scroll" tabIndex={0}><TermsDocument /></div>
    <SharingConsentBox />
    <div className="terms-accept">
      <label className="terms-check"><Checkbox checked={terms} onCheckedChange={v => setTerms(v === true)} /><span>I have read and agree to the Terms & Conditions.</span></label>
      <label className="terms-check"><Checkbox checked={share} onCheckedChange={v => setShare(v === true)} /><span>I authorize the sharing of my relevant mental-health information with my designated healthcare professional when a high-risk classification is detected.</span></label>
      <button type="button" className="terms-link" onClick={() => setReview(true)}><FileText size={15} /> Review Terms & Conditions</button>
      <Button size="lg" disabled={!canAccept(terms, share)} onClick={() => acceptConsent(terms, share)}>Accept & Continue <ArrowRight /></Button>
    </div>
    <TermsDialog open={review} onOpenChange={setReview} />
  </section></div>;
}

export function TermsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>AstraCare Terms & Conditions · v{TERMS_VERSION}</DialogTitle></DialogHeader><TermsDocument /></DialogContent></Dialog>;
}

export function useConsent() {
  const [c, setC] = useState<Consent | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { const r = () => { setC(loadConsent()); setReady(true); }; r(); window.addEventListener(CONSENT_EVENT, r); window.addEventListener('orbit-account-change', r); return () => { window.removeEventListener(CONSENT_EVENT, r); window.removeEventListener('orbit-account-change', r); }; }, []);
  return { consent: c, ready };
}

const fmt = (s?: string | null) => s ? new Date(s).toLocaleString() : '—';
export function ConsentSection() {
  const { consent } = useConsent(); const [open, setOpen] = useState(false); const [confirm, setConfirm] = useState(false);
  const r = escalationReadiness(consent);
  const rows: [string, boolean, string][] = [['Terms accepted (current version)', r.terms, r.terms ? 'Done' : 'Required'], ['Healthcare data sharing authorized', r.sharing, r.sharing ? 'Done' : 'Required'], ['Designated healthcare professional', r.professional, 'Setup required'], ['Professional notification service', r.service, 'Not connected']];
  return <section className="privacy-section"><h2>Consent & escalation</h2>
    <p>Prototype: these records are saved with your account on this device only.</p>
    <div className="consent-records"><div><span>Terms version {consent?.termsVersion ?? '—'}</span><strong>Accepted {fmt(consent?.termsAcceptedAt)}</strong></div><div><span>Healthcare data sharing</span><strong>{consent?.sharingConsent ? `Authorized ${fmt(consent.sharingConsentAt)}` : `Withdrawn ${fmt(consent?.withdrawnAt)}`}</strong></div></div>
    <h3 className="mt-5">Escalation readiness</h3>
    <ul className="readiness">{rows.map(([l, ok, s]) => <li key={l} className={ok ? 'ok' : ''}>{ok ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}<span>{l}</span><em>{ok ? 'Ready' : s}</em></li>)}</ul>
    <p className="mt-3">Until every item is ready, a high-risk classification still pauses AI advice, but nothing is sent to anyone.</p>
    <div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => setOpen(true)}><FileText /> Review Terms & Conditions</Button>
      {consent?.sharingConsent && (!confirm ? <Button variant="ghost" onClick={() => setConfirm(true)}>Withdraw data-sharing consent</Button> : <Button variant="destructive" onClick={() => withdrawSharing()}>Confirm withdrawal</Button>)}</div>
    <TermsDialog open={open} onOpenChange={setOpen} />
  </section>;
}
