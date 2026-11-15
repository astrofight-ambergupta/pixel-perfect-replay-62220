# AstraCare: rebrand + healthcare professional workspaces

## What you'll see
- **New name everywhere:** ORBIT becomes AstraCare on every screen, page title, reminder and notice. The look and colours stay the same.
- **First screen:** two choices: "Create a workspace" (for healthcare professionals) or "Join a workspace" (for astronauts, using an invite code or link). After setup, people go straight to their dashboard every time they sign in.
- **Online accounts:** sign-in becomes email + password, stored securely in Lovable Cloud. The first time someone signs in on a device that has old ORBIT data, their check-ins, voice reflections and profile are uploaded once.
- **Astronauts stay offline-first:** check-ins and voice reflections still save on the device with no connection. They upload to the workspace when the professional sends a **"Request sync" signal** and the device is online. The astronaut sees a gentle "Your care team asked for an update" notice, and can also sync by hand.
- **Healthcare Professional Dashboard:** a separate, more detailed view:
  - A list of your workspaces, with a summary for each: number of astronauts, low/moderate/high risk counts, open alerts, recent check-ins.
  - An astronaut list you can filter and sort by risk, last check-in, change from usual levels, or name.
  - **Individual astronaut profile:** full journal text, voice transcripts, check-in history, usual levels (baseline), sensor charts, risk history, AI assessments, alerts and escalation records, mission day.
  - **Professional AI review:** full analysis with the evidence behind it, deviations from that person's usual levels, and clear labels for measured, calculated, AI-interpreted and missing data. It states uncertainty and possible false alarms, and never hides concerning findings.
- **Workspace management (owner):** name the workspace, create and revoke invite codes and links, see members, remove members, give another professional access, see who viewed what, change settings.
- **Both roles:** someone who runs one workspace and is an astronaut in another gets an "Astronaut view / Professional view" switch. Switching only changes the screen. What they can see is decided separately for each workspace, so being a professional in Workspace 1 gives no extra access in Workspace 2.
- **Astronaut AI unchanged:** personal, simple guidance with the existing safety pause and escalation. Risk labels stay hidden from astronauts.

## Technical details
- Enable Lovable Cloud with email/password auth plus a `profiles` table.
- Tables: `workspaces`, `workspace_members` (user, workspace, role astronaut|professional|owner), `workspace_invites` (hashed code, expiry, uses), `checkins`, `voice_reflections` (transcript plus audio in private storage), `assessments` (deterministic risk/confidence plus AI text), `alerts`, `sync_requests`, `access_log`.
- Each table gets GRANTs and RLS. Security-definer helpers `is_member(ws)` and `is_professional(ws)`. An astronaut can only read and write their own rows. Professionals can read rows only for workspaces where `is_professional(ws)`. Risk/assessment rows are not readable by astronauts at all.
- Professional reads go through `requireSupabaseAuth` server functions that check `is_professional` and write to `access_log`. Professional AI runs on the server through the Lovable AI Gateway and receives only authorized data. Confidence, risk and insufficient-data still come from the deterministic layer.
- Offline: the existing localStorage/IndexedDB stores stay the source of truth on the device. A sync queue uploads unsent records. A realtime subscription to `sync_requests` (or a check when the app opens or regains connection) triggers the upload.
- Joining uses `/join/$code`. The view switch is a UI preference only.
- Device-only accounts are replaced. After the first cloud sign-in, a one-time import moves the old vault data into the new account.
- Tests: RLS checks with two users (astronaut can't read assessments; a professional in WS1 who is an astronaut in WS2 can't read WS2 data), invite join, sync queue, and a check that professional and astronaut AI give different output.
- Update AGENTS.md: the "inaccessible until server-enforced authorization" rule is now met through RLS.

## Not included / limits
- The "Request sync" signal arrives only when the astronaut's device is online. Nothing can reach a device that's offline.
- Email-based password reset will be added. A real medical alerting channel is still not connected.
