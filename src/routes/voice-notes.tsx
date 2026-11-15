import { createFileRoute } from '@tanstack/react-router';
import { VoiceRecorder } from '@/components/orbit-voice';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/voice-notes')({ head: () => pageHead('Voice reflections', 'AstraCare voice reflections for an individualized, continuous astronaut wellbeing journey.'), component: VoiceRecorder });
