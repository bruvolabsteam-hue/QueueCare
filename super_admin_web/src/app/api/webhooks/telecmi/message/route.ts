import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePatientResponse } from '@/lib/ai/claude';
import { sendTeleCMIMessage } from '@/lib/sms/telecmi';

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  try {
    const url = new URL(req.url);
    
    // Read from and message text
    let from = url.searchParams.get('From') || url.searchParams.get('from') || '';
    let messageText = url.searchParams.get('msg') || url.searchParams.get('message') || url.searchParams.get('text') || '';

    if (req.method === 'POST') {
      try {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          const bodyFrom = formData.get('From') || formData.get('from');
          if (bodyFrom) from = bodyFrom.toString();
          const bodyMsg = formData.get('msg') || formData.get('message') || formData.get('text');
          if (bodyMsg) messageText = bodyMsg.toString();
        } else if (contentType.includes('application/json')) {
          const body = await req.json();
          if (body.From || body.from) from = (body.From || body.from).toString();
          if (body.msg || body.message || body.text) messageText = (body.msg || body.message || body.text).toString();
        }
      } catch (err) {
        console.error('Failed to parse POST body:', err);
      }
    }

    if (!from || !messageText) {
      return NextResponse.json({ error: 'Missing from or message text' }, { status: 400 });
    }

    // Query database for patient
    const searchPhone = from.startsWith('+') ? from : `+${from}`;
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('*, clinic:clinics(*)')
      .eq('phone', searchPhone)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !patient) {
      console.log(`Patient not found or not waiting for number: ${searchPhone}`);
      return NextResponse.json({ success: false, error: 'Patient not found or not waiting' }, { status: 404 });
    }

    // Trigger Groq Brain response
    const aiReply = await generatePatientResponse(
      messageText,
      patient,
      patient.clinic
    );

    // Send the reply back via TeleCMI client
    const callerId = patient.clinic?.telecmi_caller_id;
    if (!callerId) {
      console.error(`Cannot send TeleCMI message. No telecmi_caller_id configured for clinic ${patient.clinic_id}`);
      return NextResponse.json({ success: false, error: 'No Caller ID configured for clinic' }, { status: 500 });
    }

    const success = await sendTeleCMIMessage(searchPhone, aiReply, callerId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to send SMS reply' }, { status: 500 });
    }

    return NextResponse.json({ success: true, response: aiReply });
  } catch (err: any) {
    console.error('TeleCMI message webhook error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
