import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from '@/components/orbit-dashboard';
import { pageHead } from '@/lib/orbit';

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => pageHead('Your mission wellbeing', 'AstraCare — Understanding the human behind every mission. Your individual wellbeing dashboard for life in space.'),
  component: Dashboard,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
