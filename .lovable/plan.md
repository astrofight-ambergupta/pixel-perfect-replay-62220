# Daily reminders, on-device AI Glance Report, and sensor-ready data

## What you'll see

**1. One check-in per day + reminder time**
- The welcome screen gains a fourth question: "What time do you plan to write your daily check-in?" (time picker). Editable later in Settings.
- If today's check-in already exists, the journal page shows it read-only with "You've checked in today — come back tomorrow" instead of a new form. Editing the same day's entry stays possible (revisions kept), but a second entry is never created.
- At the chosen time each day, ORBIT shows a notification ("Time for your daily check-in"). Permission is requested right after setup. If today's check-in is already done, no reminder is sent.

**2. "Glance Report" (renamed from "A picture of your wellbeing")**
- Sleep quality, stress, energy, mood, connection and cognitive load are filled in by an AI model running fully on the device, using your journal entries and voice reflections (voice is transcribed on-device first).
- Each card shows a short supportive word (e.g. "Steady"), a one-line note, a trend versus your personal baseline, and "Based on N check-ins · Updated <time>". No diagnoses or distressing labels, per the attached document.
- First use: a one-time "Download ORBIT's on-device AI" button (roughly 1–2 GB, with progress). After that it works with no internet.
- If the device can't run the model, a simpler on-device pattern analysis fills the cards and is labelled as such.
- Supportive recommendations, a "patterns needing attention" indicator, and a simulated escalation notice (clearly marked "Simulated — no message sent to Earth") follow the document's rules.

**3. "Your rhythm over time" graph** reads from a sensor data source. For now it uses an assumed-accurate built-in sensor feed (no "simulated" labels), but the code is ready to swap in real wearables.

**4. Calendar fix** — "today" currently is hardcoded to Nov 15 and the date heading is fixed text. Both will use the device's real date, and days are only marked from actual check-ins.

**5. Physiological monitoring** — all six readings (heart rate, HRV, sleep, activity, skin temperature, respiration) come from the same live sensor stream: current values update every few seconds, charts and baselines are calculated from the stored readings, and a "Connected · live" status replaces "simulated". Real sensors plug into the same stream later.

## Limitations to know
- Browsers only deliver timed reminders while ORBIT is open or recently active in the background; guaranteed reminders when fully closed need a native app or push server (future work).
- The AI download is large and works best on Chrome/Edge with modern graphics hardware.

## Technical details
- Profile: add `checkInTime` (HH:MM) to `Profile`, validation + onboarding/settings fields; update `profile.test.ts`.
- One-per-day: `useJournals.save` rejects a new entry when `date === todayDate()` exists unless revising same id; test added.
- Reminders: `src/lib/reminders.ts` schedules via `setTimeout` to next occurrence + service worker `showNotification`; re-armed on load/visibility change; skips if today's journal exists.
- AI module `src/lib/ai/` (modular per doc §6): `transcribe.ts` (Whisper tiny via @huggingface/transformers, transcripts cached in IndexedDB with each voice note), `llm.ts` (@mlc-ai/web-llm, small instruct model e.g. Qwen2.5-1.5B / Llama-3.2-1B, cached by browser), `memory.ts` (dated summaries/observations in IndexedDB), `baseline.ts` (rolling personal baseline, not auto-normalizing concerning drift), `analyze.ts` (prompt → strict JSON for the 6 dimensions + recommendations + risk flag), `fallback.ts` (rule-based scoring from journal ratings and transcript keywords), `escalation.ts` (simulated workflow). Libraries loaded lazily client-only.
- Sensors: `src/lib/sensors/` with a `SensorSource` interface (`subscribe`, `history(range)`), a `DeviceFeedSource` generating the assumed-accurate stream persisted to IndexedDB, and a registry so a BLE/HealthKit/spacecraft adapter can replace it. `OrbitChart` and Sensors page consume it.
- Dashboard/calendar: derive date label, today, and initial month from `new Date()`.
- Update AGENTS.md rules (AI module, sensor source abstraction) and roadmap.md.
