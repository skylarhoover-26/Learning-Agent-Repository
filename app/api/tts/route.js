import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { EDGE_VOICES, DEFAULT_VOICE_ID, speedToSsmlRate, escapeXml } from '@/lib/edge-voices';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { text, voice, speed } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const voiceId = (voice && EDGE_VOICES.some((v) => v.id === voice))
      ? voice
      : DEFAULT_VOICE_ID;

    const clampedSpeed = Math.min(2, Math.max(0.5, speed ?? 1));
    const sanitizedText = escapeXml(text.trim());

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(sanitizedText, { rate: speedToSsmlRate(clampedSpeed) });

    const stream = new ReadableStream({
      async start(controller) {
        const timeout = setTimeout(() => {
          try {
            controller.error(new Error('TTS stream timeout'));
            audioStream.destroy();
          } catch {
            // stream already closed
          }
        }, 30000);

        try {
          for await (const chunk of audioStream) {
            if (Buffer.isBuffer(chunk)) {
              controller.enqueue(new Uint8Array(chunk));
            }
          }
          clearTimeout(timeout);
          controller.close();
        } catch (err) {
          clearTimeout(timeout);
          try {
            controller.error(err);
          } catch {
            // stream already closed
          }
        }
      },
    });

    return new Response(stream, {
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
