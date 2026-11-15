# Terms & Conditions and consent agreement

## What you'll see
- **New setup step:** after creating an account and before the profile form, a "Terms & Conditions" screen appears, styled like the rest of ORBIT. It shows the ORBIT name and the terms version (v1.0).
- **Content in collapsible sections** inside a scrollable panel: purpose and how the AI compares wellbeing against your personal baseline, data collected, on-device storage, AI limits (not a diagnosis, no guarantee of immediate professional help), your rights, and contact/changes.
- **Risk escalation agreement (highlighted panel):** explains Low, Moderate and High classifications and the 5 steps that happen at High: AI advice pauses, your designated professional is notified (only with consent and a working connection), relevant information is sent securely, the professional decides next steps, and AI advice stays paused until safety conditions are met.
- **Separate healthcare data-sharing consent** in its own box: what is shared, why, who receives it (shown as "Not yet designated" until set up), how it's protected, and how to withdraw consent.
- **Two separate checkboxes** with the exact wording from your brief, a "Review Terms & Conditions" link that reopens the full document, and an "Accept & Continue" button that stays locked until both are ticked.
- **Updated terms:** if the terms version changes, everyone sees the screen again at their next sign-in.
- **Settings:** a new "Consent & escalation" section shows when you accepted each item, lets you reopen the terms, and lets you withdraw data sharing. It also shows escalation readiness as a checklist: terms accepted, data sharing authorized, healthcare professional ("Setup required"), notification service ("Not connected").
- **Escalation link-up:** the AI companion's high-risk workflow checks all four items. If any is missing, nothing is sent and you see "Setup required". Pausing AI advice happens no matter what, and a failed or missing notification never restarts it. The app never says an alert was delivered or reviewed without real confirmation.
- Works on desktop, tablet and phone.

## What stays out (your choices)
- Consent records are saved with the device account, clearly marked as a prototype. Online storage comes later.
- No healthcare professional or alert service is invented. Both show as unset.

## Technical details
- `src/lib/consent.ts`: `TERMS_VERSION`, per-account consent records `{termsVersion, termsAcceptedAt, sharingConsent, sharingConsentAt, withdrawnAt?}` stored in the account vault (swapped like other account data), plus `escalationReadiness()`.
- `src/components/orbit-terms.tsx`: terms screen (shadcn Accordion, ScrollArea, Checkbox). Gated in `OrbitOnboarding`/`OrbitShell`: signed in + no current consent → terms screen.
- `src/lib/ai/escalation.ts`: requires readiness before any transmission; the safety lock stays separate from the notification result.
- Tests: Accept only possible with both consents; a version bump asks again; escalation stays blocked and the lock holds when items are missing or notification fails.
- Add a rule to AGENTS.md; healthcare content stays inaccessible to astronauts. The terms describe the tiers in general terms only, never an individual classification.
