# Startup screen: crew profile

## What you'll see
- On first open, a full-screen welcome ("ORBIT — Understanding the human behind every mission") asks for:
  - Name (required)
  - Birth date (date picker, required, cannot be in the future)
  - Gender (Female, Male, Non-binary, Prefer not to say, Self-describe with text box)
- A "Begin mission" button, enabled once all fields are valid, opens the dashboard.
- On later visits the startup screen is skipped; the dashboard greets the person by name.
- Settings gets an "Edit profile" section to change these details or reset and see the startup screen again.
- Styling follows the calm light aerospace palette (white, sage, mint, pale sky, navy accents).

## Technical details
- Profile stored in localStorage (offline prototype, consistent with journals); read in useEffect to avoid hydration mismatch.
- New `OrbitOnboarding` component rendered as a gate in the app shell when no profile exists, so every route is covered.
- Zod validation via react-hook-form + shadcn date picker.
- Small unit test for validation rules (required name, no future birth date).
