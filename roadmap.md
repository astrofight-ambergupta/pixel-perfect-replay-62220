# ORBIT prototype
- [x] Astronaut dashboard and complete navigation
- [x] Offline journal submissions, edits, revisions, and detail pages
- [x] Consented voice recording, playback, and separate archive
- [x] Demonstration insights, sensor graphs, mission timeline, privacy settings
- [x] Restricted healthcare entry; confidential data remains unavailable
- [x] Validate journal creation/edit/readback, microphone capture/playback, offline save, and desktop/tablet/phone layouts
- [ ] Verify reopening after closing the browser offline; development-preview module loading prevents full offline hydration, so published-environment validation is required.

- [x] Daily check-in time at setup + daily reminder; one official check-in per day with supplementary notes
- [x] Glance Report powered by on-device AI module (baseline, memory, companion chat, transcription, simulated escalation)
- [x] Sensor source abstraction for rhythm graph and physiological monitoring (simulated, labelled)
- [x] Calendar uses the real date

## Production dependencies not included in this local prototype
- AI interpretations need clinical validation; a real escalation channel to Earth is required before any takeover can be confirmed.
- Healthcare assessments, alerts, assignments, and access logs require verified medical authorization and secure storage.
- Encrypted mission storage and secure synchronization require a mission-side service.
- Real sensor readings require compatible sensor integration.