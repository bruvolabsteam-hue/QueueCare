import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendTeleCMIMessage } from '@/lib/sms/telecmi';

// POST: Trigger outbound notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_id, event_type } = body;

    if (!patient_id || !event_type) {
      return NextResponse.json({ error: 'Missing patient_id or event_type' }, { status: 400 });
    }

    // 1. Fetch patient and clinic data
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('*, clinic:clinics(*)')
      .eq('id', patient_id)
      .single();

    if (error || !patient || !patient.clinic) {
      return NextResponse.json({ error: 'Patient or Clinic not found' }, { status: 404 });
    }

    // 2. Calculate current serving token for the same doctor
    const { data: currentPatient } = await supabaseAdmin
      .from('patients')
      .select('token_number')
      .eq('clinic_id', patient.clinic_id)
      .eq('doctor_id', patient.doctor_id)
      .eq('status', 'called')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
      
    const currentToken = currentPatient ? currentPatient.token_number : (patient.token_number - 1);

    // 3. Generate the message based on the event type
    let message = '';
    const clinicName = patient.clinic.whitelabel_name || patient.clinic.clinic_name || 'BruvoFlow Clinic';

    if (event_type === 'welcome') {
      message = `Welcome to ${clinicName}! Your token number is ${patient.token_number}. ` + 
                `The currently serving token is ${currentToken}. ` + 
                `We will notify you when it's almost your turn.`;
    } else if (event_type === 'queue_alert') {
      const peopleAhead = Math.max(0, patient.token_number - currentToken);
      message = `Alert from ${clinicName}: It's almost your turn! ` +
                `There are only ${peopleAhead} people ahead of you. Please head towards the doctor's cabin.`;
    } else {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    // 4. Send via TeleCMI
    console.log(`Sending TeleCMI message to ${patient.phone}`);
    const callerId = patient.clinic.whatsapp_sender_number;

    if (!callerId) {
      console.error(`Cannot send SMS. No whatsapp_sender_number configured for clinic ${patient.clinic_id}`);
      return NextResponse.json({ success: false, error: 'No SMS Caller ID configured.' }, { status: 500 });
    }

    const success = await sendTeleCMIMessage(patient.phone, message, callerId);

    if (success) {
      return NextResponse.json({ success: true, channel: 'sms', message: 'Delivered via TeleCMI' });
    }

    return NextResponse.json({ success: false, error: 'TeleCMI sending failed.' }, { status: 500 });
    
  } catch (error) {
    console.error('Outbound Notify Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
