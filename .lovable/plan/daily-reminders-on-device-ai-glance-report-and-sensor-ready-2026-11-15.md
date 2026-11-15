# Daily reminders, on-device AI Glance Report, and sensor-ready data

## What you'll see

**1. One check-in per day + reminder time**
- The welcome screen gains a fourth question: "What time do you plan to write your daily check-in?" (time picker). Editable later in Settings.
- There is one official check-in per day. Once it's done, the journal page shows it with "Official check-in complete" and offers "Add a note" for extra entries during the day. Extra notes are marked as supplementary and never replace the official check-in. Every edit keeps its revision history.
- At the chosen time each day, ORBIT shows a notification ("Time for your daily check-in"). Permission is requested right after setup. If today's check-in is already done, no reminder is sent.

**2. "Glance Report" (renamed from "A picture of your wellbeing")**
- Sleep quality, stress, energy, mood, connection and cognitive load are filled in by an AI model running fully on the device, using your journal entries and voice reflections (voice is transcribed on-device first).
- Each card shows a short supportive word, a one-line note and a confidence level (Low / Moderate / Good). It also says where the reading comes from: "You reported", "Measured (simulated)" or "AI interpretation". If there isn't enough data, the card says "Not enough information yet" instead of guessing. Sleep and energy can draw on sensor readings; mood, stress and connection come mainly from what you report. No diagnoses or distressing labels.
- First use: a one-time "Download ORBIT's on-device AI" button (roughly 1–2 GB, with progress). After that it works with no internet.
- If the device can't run the model, a simpler on-device pattern analysis fills the cards and is labelled as such.
- Supportive recommendations, a "patterns needing attention" indicator, and a simulated escalation notice (clearly marked "Simulated — no message sent to Earth") follow the document's rules.

**3. "Your rhythm over time" graph** reads from a sensor data source. For now the readings are clearly labelled "Simulated sensor data", and the code is ready to switch to real wearables later.

**4. Calendar fix** — "today" currently is hardcoded to Nov 15 and the date heading is fixed text. Both will use the device's real date, and days are only marked from actual check-ins.

**5. Physiological monitoring:** all six readings (heart rate, HRV, sleep, activity, skin temperature, respiration) come from the same live sensor stream: current values update every few seconds, and charts and baselines are calculated from the stored readings. The status reads "Simulated source · not a real sensor", and real sensors connect to the same stream later. Nothing is presented as a real body measurement.

**6. Full AI wellbeing module (from your document)**, built into the existing app rather than a separate one:
- **Pre-mission baseline:** a 3-week "baseline building" phase with a progress bar (days and check-ins collected). It shows whether there's enough data yet, for example "Baseline not yet reliable: 9 of at least 14 check-ins". Later updates leave out days flagged as concerning and limit how fast the baseline can shift, so worrying changes never become the new normal.
- **AI companion page:** a new "AI companion" item in the sidebar. It shows daily summaries and supportive recommendations, and lets you ask questions about them in a chat, all on the device. Suggestions leave the choice to you and never show diagnoses.
- **Memory and history:** entries and transcripts are sorted by date, with AI summaries, highlighted significant days, recurring patterns, and whether earlier concerns improved, stayed the same or got worse. Relevant past entries are pulled in when the AI writes recommendations.
- **Attention indicator:** a calm marker on the dashboard when patterns need extra attention.
- **Escalation:** the stages are Flagged, Notification queued, Awaiting confirmation and Professional confirmed. Here, every step is labelled "Simulated: no message sent to Earth". You are only told a professional has taken over at the Confirmed stage, which can't happen in simulation. Until then, ORBIT pauses its own wellbeing advice, shows supportive safety information, and keeps retrying. Delays, unavailable professionals and false alarms (with review) are all handled, and an alert is never silently dropped.
- **Healthcare reporting hook:** results are stored so they can feed the healthcare view later, once secure access exists.

## Limitations to know
- Browsers only deliver timed reminders while ORBIT is open or recently active in the background; guaranteed reminders when fully closed need a native app or push server (future work).
- The AI download is large and works best on Chrome/Edge with modern graphics hardware.

## Technical details
- Profile: add `checkInTime` (HH:MM) to `Profile`, validation + onboarding/settings fields; update `profile.test.ts`.
- One-per-day: `useJournals.save` rejects a new entry when `date === todayDate()` exists unless revising same id; test added.
- Reminders: `src/lib/reminders.ts` schedules via `setTimeout` to next occurrence + service worker `showNotification`; re-armed on load/visibility change; skips if today's journal exists.
- AI module `src/lib/ai/` (modular per doc §6) behind a provider interface (`AnalysisProvider`: on-device WebLLM, rule-based fallback, and a future cloud/server provider slot), selectable in Settings; outputs carry `source: self_report|sensor|ai_inference`, `confidence`, `insufficientData`. Journal model gets `kind: official|supplementary`. `transcribe.ts` (Whisper tiny via @huggingface/transformers, transcripts cached in IndexedDB with each voice note), `llm.ts` (@mlc-ai/web-llm, small instruct model e.g. Qwen2.5-1.5B / Llama-3.2-1B, cached by browser), `memory.ts` (dated summaries/observations in IndexedDB), `baseline.ts` (rolling personal baseline, not auto-normalizing concerning drift), `analyze.ts` (prompt → strict JSON for the 6 dimensions + recommendations + risk flag), `fallback.ts` (rule-based scoring from journal ratings and transcript keywords), `escalation.ts` (simulated workflow). Libraries loaded lazily client-only.
- Sensors: `src/lib/sensors/` with a `SensorSource` interface (`subscribe`, `history(range)`), a `DeviceFeedSource` generating the assumed-accurate stream persisted to IndexedDB, and a registry so a BLE/HealthKit/spacecraft adapter can replace it. `OrbitChart` and Sensors page consume it.
- Dashboard/calendar: derive date label, today, and initial month from `new Date()`.
- Companion route `src/routes/companion.tsx` + shell nav item; baseline phase derived from profile launch date (add optional launch date to setup, default 21 days after onboarding); memory view on journal history; chat uses same WebLLM engine with retrieved memory as context.
- Update AGENTS.md rules (AI module, sensor source abstraction) and roadmap.md.

- All existing pages, navigation and design are preserved; changes extend current components rather than rebuilding them.
