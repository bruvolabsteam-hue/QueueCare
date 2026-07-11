import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const fallbackBuffer = Buffer.alloc(64, 0);

    // Static fallbacks
    if (['no-ticket', 'repeat', 'maintenance', 'welcome', 'hangup'].includes(id)) {
      return new NextResponse(fallbackBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      });
    }

    const audioCache = ((global as any).audioCache = (global as any).audioCache || new Map<string, Buffer | Promise<Buffer>>());
    let audioDataOrPromise = audioCache.get(id);

    if (!audioDataOrPromise) {
      const promise = (async () => {
        try {
          const textCache = ((global as any).textCache = (global as any).textCache || new Map<string, string>());
          let text = textCache.get(id);
          if (!text) {
            text = url.searchParams.get('text') || 'System status normal';
          }

          // Get ElevenLabs API key from the database
          const { data: settings, error } = await supabaseAdmin
            .from('global_settings')
            .select('elevenlabs_api_key')
            .limit(1)
            .single();

          const apiKey = settings?.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY || '';

          const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_monolingual_v1',
            }),
          });

          if (!response.ok) {
            console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
            return fallbackBuffer;
          }

          const arrayBuffer = await response.arrayBuffer();
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            console.error('ElevenLabs returned empty or invalid buffer');
            return fallbackBuffer;
          }

          return Buffer.from(arrayBuffer);
        } catch (err) {
          console.error('Failed to generate ElevenLabs audio:', err);
          return fallbackBuffer;
        }
      })();

      audioCache.set(id, promise);

      try {
        const buffer = await promise;
        // Cache the final resolved Buffer
        audioCache.set(id, buffer);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
          },
        });
      } catch (err) {
        audioCache.delete(id);
        throw err;
      }
    } else {
      const buffer = await audioDataOrPromise;
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      });
    }
  } catch (err) {
    console.error('Audio streaming route error:', err);
    return new NextResponse(Buffer.alloc(64, 0), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  }
}
