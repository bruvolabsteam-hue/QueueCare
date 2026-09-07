import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook endpoint for Voice AI (e.g., Bland AI) post-call data
export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Example payload from Voice AI webhook
    // { call_id: "...", variables: { patient_id: "..." }, summary: "The patient said they are not coming." }
    const patientId = body.variables?.patient_id || body.patient_id;
    const summary = body.summary || '';
    const transcript = body.transcript || '';

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patient_id in webhook payload' }, { status: 400 });
    }

    // Simple NLP / keyword matching to determine intent if a structured intent isn't provided
    const textToAnalyze = (summary + ' ' + transcript).toLowerCase();
    
    let newOutboundStatus = 'confirmed'; // Default assumption if they answered
    let newPatientStatus = 'waiting';

    const cancelKeywords = ['cancel', 'not coming', 'no show', 'skip', 'reschedule', 'can\'t make it', 'cannot make it'];
    const delayKeywords = ['late', 'delayed', 'running behind', '5 minutes', '10 minutes', 'stuck in traffic'];

    if (cancelKeywords.some(kw => textToAnalyze.includes(kw))) {
      newOutboundStatus = 'cancelled';
      newPatientStatus = 'skipped'; // Bumps up everyone else behind them
    } else if (delayKeywords.some(kw => textToAnalyze.includes(kw))) {
      newOutboundStatus = 'delayed';
    }

    // Update the patient in Supabase
    await supabase
      .from('patients')
      .update({ 
        outbound_status: newOutboundStatus,
        status: newPatientStatus
      })
      .eq('id', patientId);

    return NextResponse.json({ success: true, outbound_status: newOutboundStatus });

  } catch (err) {
    console.error('Outbound Webhook Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
