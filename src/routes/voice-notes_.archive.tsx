import { createFileRoute } from '@tanstack/react-router';
import { VoiceArchive } from '@/components/orbit-voice';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/voice-notes_/archive')({ head: () => pageHead('Voice archive', 'ORBIT voice archive for an individualized, continuous astronaut wellbeing journey.'), component: VoiceArchive });
