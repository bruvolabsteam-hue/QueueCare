import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';
import { sendExotelSMS } from '@/lib/sms/exotel';

// POST: Trigger outbound notification (WhatsApp -> SMS fallback)
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

    // 2. Generate the message based on the event type
    let message = '';
    const clinicName = patient.clinic.whitelabel_name || patient.clinic.clinic_name || 'BruvoFlow Clinic';

    if (event_type === 'welcome') {
      message = `Welcome to ${clinicName}! Your token number is ${patient.token_number}. ` + 
                `The currently serving token is ${patient.clinic.current_token}. ` + 
                `We will notify you when it's almost your turn.`;
    } else if (event_type === 'queue_alert') {
      const peopleAhead = Math.max(0, patient.token_number - patient.clinic.current_token);
      message = `Alert from ${clinicName}: It's almost your turn! ` +
                `There are only ${peopleAhead} people ahead of you. Please head towards the doctor's cabin.`;
    } else {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    // 3. Attempt to send via WhatsApp
    console.log(`Attempting to send WhatsApp message to ${patient.phone_number}`);
    const whatsappSuccess = await sendWhatsAppMessage(patient.phone_number, message);

    if (whatsappSuccess) {
      return NextResponse.json({ success: true, channel: 'whatsapp', message: 'Delivered via WhatsApp' });
    }

    // 4. Fallback to Exotel SMS
    console.log(`WhatsApp failed for ${patient.phone_number}. Falling back to Exotel SMS...`);
    
    // Use the clinic's Exotel Caller ID if available, otherwise it will fail in a real scenario
    const callerId = patient.clinic.exotel_caller_id;
    
    if (!callerId) {
      console.error(`Cannot send SMS fallback. No exotel_caller_id configured for clinic ${patient.clinic_id}`);
      return NextResponse.json({ success: false, error: 'WhatsApp failed and no SMS Caller ID configured.' }, { status: 500 });
    }

    const smsSuccess = await sendExotelSMS(patient.phone_number, message, callerId);

    if (smsSuccess) {
      return NextResponse.json({ success: true, channel: 'sms', message: 'Delivered via SMS Fallback' });
    }

    return NextResponse.json({ success: false, error: 'Both WhatsApp and SMS failed.' }, { status: 500 });
    
  } catch (error) {
    console.error('Outbound Notify Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
