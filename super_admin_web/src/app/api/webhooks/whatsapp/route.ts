import { NextRequest, NextResponse } from 'next/server';
import { generatePatientResponse } from '@/lib/ai/claude';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';
import { supabaseAdmin } from '@/lib/supabase-admin';

// WhatsApp Verify Token
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bruvoflow_secure_webhook';

// GET: Webhook verification for Meta
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// POST: Handle incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's a WhatsApp message event
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const fromNumber = message.from; // Phone number
        const text = message.text?.body;

        if (text && fromNumber) {
          console.log(`Received message from ${fromNumber}: ${text}`);

          // 1. Format phone number to match database (add '+' if missing)
          const searchPhone = fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`;

          // 2. Query Supabase for the patient
          const { data: patient, error } = await supabaseAdmin
            .from('patients')
            .select('*, clinic:clinics(*)')
            .eq('phone_number', searchPhone)
            .eq('status', 'waiting') // Only care about waiting patients
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error || !patient) {
            // Patient not found in active queue
            await sendWhatsAppMessage(
              fromNumber, 
              "I'm sorry, I couldn't find an active queue ticket for this phone number. Please check with the clinic reception."
            );
          } else {
            // 3. Let Claude generate the intelligent response
            const aiReply = await generatePatientResponse(
              text, 
              patient, 
              patient.clinic
            );

            // 4. Send the reply back to the patient
            await sendWhatsAppMessage(fromNumber, aiReply);
          }
        }
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
