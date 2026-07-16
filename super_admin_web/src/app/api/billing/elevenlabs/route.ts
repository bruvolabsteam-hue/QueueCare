import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // 1. Fetch ElevenLabs API Key from global_settings
    const { data: settings } = await supabaseAdmin
      .from('global_settings')
      .select('elevenlabs_api_key')
      .limit(1)
      .single();

    if (!settings || !settings.elevenlabs_api_key) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured.' }, { status: 400 });
    }

    // 2. Fetch Subscription Info from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': settings.elevenlabs_api_key
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to fetch ElevenLabs data', details: errorText }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      character_count: data.character_count,
      character_limit: data.character_limit,
      tier: data.tier
    });

  } catch (error: any) {
    console.error('ElevenLabs Billing Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
