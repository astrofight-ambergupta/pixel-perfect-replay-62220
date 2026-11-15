# Fix startup, check-in calendar, mission timeline, and voice reflection

## 1. Startup asks for the astronaut every time (testing mode)
- Each time the app opens, the welcome screen appears first and asks "Who is checking in?" (name) to confirm the right person, then the profile fields.
- Testing mode: profile, journals, voice reflection, AI memory and reminders are cleared at every new app launch, so every session starts fresh. A clearly labelled "Testing mode: data resets each session" note shows on the welcome screen.
- Kept in one switch so it can be turned off later for real use (data would then persist and the name screen would only confirm identity).

## 2. No pre-filled check-ins
- Remove the 7 sample journal entries. New profiles start with an empty calendar.
- Calendar checks only dates that have a real, saved official check-in, using the device's actual date. Today is highlighted but never checked until submitted.
- Glance Report, history and companion show "not enough data yet" until real entries exist.

## 3. Mission start date and correct mission day
- Welcome screen adds "When does your mission start?" (date, required; past or future allowed).
- Mission day = days from the start date: before launch it shows negatives (e.g. "Mission day −12" / "T−12 days to launch"), launch day is Day 1, then counts up.
- Banner, journal heading, saved entries and timeline all use this value. Banner progress bar and "Pre-mission / Active mission" badge follow it. Mission start is editable in Settings.

## 4. One voice reflection with live prompt tracking
- Replace the multi-recording flow with a single, longer reflection per day. Once saved, the page shows today's reflection (play back) instead of a new recorder; the archive lists one per day.
- During recording, a checklist of the major prompts (one per topic: personal reflection, stress & adaptation, social wellbeing, cognitive functioning — 16 prompts grouped into 4 topics) updates live: each topic ticks when the spoken words cover it.
- Live listening uses the browser's speech recognition while recording; topic coverage is matched by on-device keyword rules. Where live recognition is unavailable (some browsers / fully offline), the astronaut can tick topics manually and the full on-device transcription still runs after saving.
- Before finishing, uncovered topics are gently highlighted ("You haven't talked about social wellbeing yet") — non-blocking, never judgmental.

## Technical details
- `profile.ts`: add `missionStart`; validation; `missionDay(start, today)` (no day 0: before start = negative, start = 1).
- Session reset: on launch, a `sessionStorage` marker; if absent, clear `orbit-*` localStorage keys and the voice IndexedDB, then set marker. Flag `TESTING_FRESH_SESSIONS` in one module.
- `orbit.ts`: `useJournals` default `[]`, delete `demoJournals` usage; update tests that rely on it.
- Voice: `canSaveVoiceNote` (one per date), `promptCoverage(transcript)` keyword matcher in `src/lib/ai`, Web Speech API `SpeechRecognition` with interim results; unit tests for one-per-day, coverage matching, and negative/positive mission day.
- Update `AGENTS.md` rules (fresh-session testing mode, one voice reflection per date).
