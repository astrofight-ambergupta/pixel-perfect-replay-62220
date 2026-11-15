<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## ORBIT architecture
- Keep feature views in focused shared components and expose each workspace through a TanStack leaf route; this preserves typed navigation and distinct metadata.
- For this offline prototype, store journals with immutable original timestamps and revisions in localStorage, and audio Blobs in IndexedDB; this avoids requiring connectivity for capture.
- Healthcare data is reachable only through workspace-scoped RLS and requireSupabaseAuth server functions (src/lib/pro); roles live in workspace_members per workspace, never in client storage or profiles, so one workspace's role grants nothing in another.
- AI lives in src/lib/ai behind an AnalysisProvider interface (on-device LLM, rule-based, future remote); confidence, insufficient-data and risk always come from the deterministic layer so an LLM can't override safety or invent certainty.
- Sensor data flows only through the SensorSource registry in src/lib/sensors; the prototype source must stay flagged simulated so generated readings are never shown as real measurements.
- Escalation only reaches 'confirmed' with a real channel confirmation; simulated mode never claims a professional took over.
- Only one official journal check-in per date; supplementary notes are separate entries, and all edits keep revisions.
- Cache the application shell using a same-origin service worker; secure synchronization and encrypted mission storage remain future production work.
- Mission day is derived from the profile's mission start date (negative before launch, launch = day 1); never hardcode mission days.
- Only one voice reflection per local date; live topic coverage comes from src/lib/ai/coverage.ts.

- Sign-in is Cloud email/password; the device vault in src/lib/accounts.ts is keyed by the cloud user id so local offline data stays per-user. Capture stays offline-first; src/lib/sync.ts uploads journals/transcripts (never audio) to the user's astronaut workspaces.
- Astronaut vs professional view comes from resolveView() in src/lib/cloud.ts; dual-role users switch views, and astronaut UI never shows clinical risk labels.
- Workspace permission checks live in supabase/tests/permissions.sql (run via run_sql; it rolls itself back).
- Testing mode (TESTING_FRESH_SESSIONS in src/lib/session.ts) keeps accounts and profiles but wipes check-ins, voice, AI memory and reminders on each new browser session.
- Dates derive from the profile's time zone via todayDate()/useToday() (built-in Intl data, offline); never use the raw device date.
- Consent (src/lib/consent.ts) is versioned per account; bumping TERMS_VERSION re-prompts everyone. Escalation transmits only when escalationReadiness() is fully met, while the AI safety lock is independent of notification outcome.
