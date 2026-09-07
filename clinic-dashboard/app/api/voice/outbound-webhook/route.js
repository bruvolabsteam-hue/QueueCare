import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook endpoint for Voice AI (e.g., Bland AI) post-call data
export async function POST(req) {
  try {
    // 1. Verify Webhook Secret for security
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (webhookSecret) {
      // ElevenLabs passes the secret in the header
      const signature = req.headers.get('elevenlabs-signature');
      if (signature !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook - invalid signature' }, { status: 401 });
      }
    }
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

    // If cancelled, trigger "come early" message to the next patient in line
    if (newOutboundStatus === 'cancelled') {
      // 1. Get the current patient's clinic and doctor
      const { data: cancelledPatient } = await supabase
        .from('patients')
        .select('clinic_id, doctor_id, token_number, clinics(name)')
        .eq('id', patientId)
        .single();
      
      if (cancelledPatient) {
        const today = new Date().toISOString().split('T')[0];
        // 2. Find the NEXT waiting patient for this doctor who hasn't been called/skipped
        const { data: nextPatients } = await supabase
          .from('patients')
          .select('id, name, phone, token_number')
          .eq('clinic_id', cancelledPatient.clinic_id)
          .eq('doctor_id', cancelledPatient.doctor_id)
          .eq('status', 'waiting')
          .gte('created_at', today)
          .gt('token_number', cancelledPatient.token_number)
          .order('token_number', { ascending: true })
          .limit(1);
          
        if (nextPatients && nextPatients.length > 0) {
          const nextPatient = nextPatients[0];
          const clinicName = cancelledPatient.clinics?.name || 'the clinic';
          
          // 3. Send them an early arrival message
          const messageContent = `Hi ${nextPatient.name}, good news! A patient ahead of you at ${clinicName} has cancelled. The queue is moving faster than expected. Are you able to come in earlier? Please reply YES if you can arrive soon, or NO if you will stick to your original estimated time.`;
          
          await supabase.from('pending_messages').insert({
            clinic_id: cancelledPatient.clinic_id,
            patient_phone: nextPatient.phone,
            event_type: 'early_arrival_opportunity',
            message_content: messageContent,
            platform: 'whatsapp',
            status: 'pending'
          });
        }
      }
    }

    return NextResponse.json({ success: true, outbound_status: newOutboundStatus });

  } catch (err) {
    console.error('Outbound Webhook Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
