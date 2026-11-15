# Device accounts with password sign-in

## What you'll see
- **First launch (no accounts):** "Create your astronaut account" — name, password (min 8 characters) and confirm password, then the existing profile questions (birth date, gender, mission start, check-in time).
- **Later launches:** "Who is checking in?" shows a card for each account on this device (initials + name). Tap one, enter its password, and you're in. Wrong password shows a gentle error. A "Create new account" option stays available.
- Each account has its own profile, check-ins, voice reflection, AI memory and reminders, so accounts never see each other's data.
- Sidebar profile menu gets "Switch account / Sign out", returning to the account picker.
- Settings: change password (requires current password) and delete account.
- Testing mode: accounts and passwords are kept; check-ins, voice reflections, AI memory and reminders reset at each new app launch. Welcome note updated to say so.

## Note on security
Accounts live only on this device and passwords are stored scrambled (salted hash), never as plain text. This confirms the right person in the prototype but is not real security — anyone with access to the device's storage could bypass it. Healthcare content stays locked as before.

## Technical details
- New `src/lib/accounts.ts`: accounts list in localStorage (`orbit-accounts-v1`: id, name, salt, PBKDF2-SHA256 hash via Web Crypto, createdAt); `createAccount`, `verifyPassword`, `changePassword`, `deleteAccount`; active account id in sessionStorage (signed out on new launch).
- Namespace per-account data keys by account id (profile, journals, AI memory, reminders, voice IndexedDB records tagged with accountId).
- `session.ts`: reset wipes per-account data but preserves `orbit-accounts-v1` and profiles.
- `orbit-onboarding.tsx`: account picker, password step, create-account flow.
- Tests: password hashing/verify (correct vs wrong), unique account names, reset keeps accounts but clears check-ins.
- Update `AGENTS.md` testing-mode rule and add a device-accounts rule.
