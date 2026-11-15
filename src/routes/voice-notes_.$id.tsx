import { createFileRoute } from '@tanstack/react-router';
import { VoiceDetail } from '@/components/orbit-voice';
import { pageHead } from '@/lib/orbit';
export const Route = createFileRoute('/voice-notes_/$id')({ head: () => pageHead('Voice reflection', 'Your private ORBIT voice reflection and longitudinal record.'), component: Detail });
function Detail() { const { id } = Route.useParams(); return <VoiceDetail id={id}/>; }
