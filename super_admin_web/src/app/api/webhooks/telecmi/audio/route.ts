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

    const STATIC_FALLBACKS: Record<string, string> = {
      'no-ticket': 'We could not find an active appointment for your phone number. Please contact reception.',
      'repeat': 'I am sorry, I did not catch that. Please repeat.',
      'maintenance': 'Our wait time system is temporarily under maintenance. Please hold the line or call reception.',
      'welcome': 'Welcome. How can I help you regarding your appointment today?',
      'hangup': 'Thank you for calling. Goodbye.'
    };

    const audioCache = ((global as any).audioCache = (global as any).audioCache || new Map<string, Buffer | Promise<Buffer>>());
    let audioDataOrPromise = audioCache.get(id);

    if (!audioDataOrPromise) {
      const promise = (async () => {
        try {
          let text = '';
          if (STATIC_FALLBACKS[id]) {
            text = STATIC_FALLBACKS[id];
          } else {
            const textCache = ((global as any).textCache = (global as any).textCache || new Map<string, string>());
            text = textCache.get(id);
            if (!text) {
              text = url.searchParams.get('text') || 'System status normal';
            }
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
              model_id: 'eleven_multilingual_v2',
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

          // Inline low balance check (10% probability to avoid rate limits)
          if (Math.random() < 0.1) {
            try {
              const alertUrl = new URL('/api/cron/elevenlabs-alert', req.url).toString();
              fetch(alertUrl).catch(e => console.error('Background alert check failed', e));
            } catch (e) {
              console.error(e);
            }
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
