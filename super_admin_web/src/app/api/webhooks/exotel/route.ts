import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePatientResponse } from '@/lib/ai/claude';

function createExomlResponse(content: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${content}\n</Response>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    }
  );
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const action = url.searchParams.get('action');
    const simulateDbError = url.searchParams.get('simulate_db_error') === 'true';

    if (simulateDbError) {
      return createExomlResponse(`<Play>${origin}/api/webhooks/exotel/audio?id=maintenance</Play>\n<Hangup/>`);
    }

    if (action && action !== 'speech' && action !== 'hangup') {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Read from and transcription text
    let from = url.searchParams.get('From') || '';
    let transcriptionText = url.searchParams.get('TranscriptionText') || '';

    if (req.method === 'POST') {
      try {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          const bodyFrom = formData.get('From');
          if (bodyFrom) from = bodyFrom.toString();
          const bodyTrans = formData.get('TranscriptionText');
          if (bodyTrans) transcriptionText = bodyTrans.toString();
        } else if (contentType.includes('application/json')) {
          const body = await req.json();
          if (body.From) from = body.From.toString();
          if (body.TranscriptionText) transcriptionText = body.TranscriptionText.toString();
        }
      } catch (err) {
        console.error('Failed to parse POST body:', err);
      }
    }

    if (!from) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    if (action === 'hangup') {
      return createExomlResponse(`<Play>${origin}/api/webhooks/exotel/audio?id=hangup</Play>\n<Hangup/>`);
    }

    // Query database for patient
    const searchPhone = from.startsWith('+') ? from : `+${from}`;
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('*, clinic:clinics(*)')
      .eq('phone_number', searchPhone)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return createExomlResponse(`<Play>${origin}/api/webhooks/exotel/audio?id=no-ticket</Play>\n<Hangup/>`);
      }
      return createExomlResponse(`<Play>${origin}/api/webhooks/exotel/audio?id=maintenance</Play>\n<Hangup/>`);
    }

    if (!patient) {
      return createExomlResponse(`<Play>${origin}/api/webhooks/exotel/audio?id=no-ticket</Play>\n<Hangup/>`);
    }

    // Initial call: no action parameter
    if (!action) {
      return createExomlResponse(
        `<Gather input="speech" action="${origin}/api/webhooks/exotel?action=speech" method="POST" timeout="5">\n` +
        `  <Play>${origin}/api/webhooks/exotel/audio?id=welcome</Play>\n` +
        `</Gather>`
      );
    }

    if (action === 'speech') {
      if (!transcriptionText || transcriptionText.trim() === '') {
        return createExomlResponse(
          `<Gather input="speech" action="${origin}/api/webhooks/exotel?action=speech" method="POST" timeout="5">\n` +
          `  <Play>${origin}/api/webhooks/exotel/audio?id=repeat</Play>\n` +
          `</Gather>`
        );
      }

      // Call Claude (Ollama)
      const aiReply = await generatePatientResponse(
        transcriptionText,
        patient,
        patient.clinic
      );

      const audioId = `audio-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const textCache = ((global as any).textCache = (global as any).textCache || new Map<string, string>());
      textCache.set(audioId, aiReply);

      return createExomlResponse(
        `<Gather input="speech" action="${origin}/api/webhooks/exotel?action=speech" method="POST" timeout="5">\n` +
        `  <Play>${origin}/api/webhooks/exotel/audio?id=${audioId}</Play>\n` +
        `</Gather>`
      );
    }

    return new NextResponse('Bad Request', { status: 400 });
  } catch (err) {
    console.error('Webhook execution failed:', err);
    return createExomlResponse(`<Play>${origin}/api/webhooks/exotel/audio?id=maintenance</Play>\n<Hangup/>`);
  }
}
