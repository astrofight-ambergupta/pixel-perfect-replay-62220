# Voice reflection must cover every topic, live mission-day banner, offline time zone

## 1. Voice reflection: all 4 topics required
- "Save today's reflection" stays locked until all 4 topics (personal reflection, stress & adaptation, social wellbeing, cognitive functioning) are covered. A topic counts as covered when it's spoken about or ticked by hand.
- While save is locked, a calm note under the button names the topics still missing, e.g. "Talk about social wellbeing to finish."
- The save step checks this again, so a reflection with missing topics is never stored.

## 2. Mission day banner updates in real time
- The banner (mission day / T− countdown, progress bar, Pre-mission / Active badge) updates automatically when the date changes, for example at midnight, when the device wakes up or when the app tab is reopened. No reload needed.
- It updates instantly when the mission start date or time zone is changed in Settings.

## 3. Time zone chosen at setup (works offline)
- Setup adds a "Your time zone" choice, filled in with the device's current time zone and searchable. Every time zone is built into the app, so nothing has to be downloaded.
- "Today", mission day, the check-in calendar and reminders all follow the chosen time zone, even with no internet or if the device clock's zone changes. It can be edited in Settings.
- Profiles that already exist fall back to the device time zone until one is chosen.

## Technical details
- `coverage.ts`: add `allTopicsCovered(auto, manual)`. `orbit-voice.tsx`: disable the save button and guard `save()` with it. Add a unit test.
- `profile.ts`: optional `timeZone` with validation against `Intl.supportedValuesOf('timeZone')`. Default is `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `orbit.ts`: `todayDate(tz)` uses `Intl.DateTimeFormat('en-CA', { timeZone })`. Add a `useToday()` hook that ticks every 60 s and on `visibilitychange`/`focus`, plus profile-change events. The shell banner uses `missionDay(useToday())`.
- Tests: zone-aware `todayDate` (the same instant gives different dates in different zones), and blocking saves when topics are missing.
- AGENTS.md: dates derive from the profile time zone through `todayDate`.
