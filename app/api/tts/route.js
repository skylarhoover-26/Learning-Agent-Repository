// Text-to-speech via OpenAI (gpt-4o-mini-tts) — natural, consistent voices that
// work in serverless. Falls back to browser TTS client-side if this fails or the
// key isn't configured.

const OPENAI_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse',
]);
const DEFAULT_VOICE = 'nova';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      // Not configured — client will fall back to browser TTS.
      return Response.json({ error: 'TTS not configured' }, { status: 503 });
    }

    const selectedVoice = OPENAI_VOICES.has(voice) ? voice : DEFAULT_VOICE;

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: selectedVoice,
        input: text.slice(0, 4000),
        response_format: 'mp3',
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('OpenAI TTS error:', res.status, detail.slice(0, 300));
      return Response.json({ error: 'TTS failed' }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS generation failed:', error);
    return Response.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}
