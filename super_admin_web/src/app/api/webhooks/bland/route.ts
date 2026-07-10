import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST: Handle incoming Bland AI Tool Calls
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bland AI usually sends the caller's phone number and the tool arguments
    const { phone_number } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    console.log(`Bland AI checking queue for: ${phone_number}`);

    // 1. Format phone number to match database (add '+' if missing)
    const searchPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;

    // 2. Query Supabase for the patient
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('*, clinic:clinics(*)')
      .eq('phone_number', searchPhone)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !patient) {
      return NextResponse.json({ 
        message: "No active token found for this phone number.",
        has_appointment: false
      });
    }

    // 3. Return the exact data Bland AI needs to speak to the patient
    const peopleAhead = Math.max(0, patient.token_number - (patient.clinic?.current_token || 0));

    return NextResponse.json({
      has_appointment: true,
      patient_name: patient.name,
      token_number: patient.token_number,
      currently_serving: patient.clinic?.current_token,
      people_ahead: peopleAhead,
      clinic_name: patient.clinic?.name,
      message: `Your token number is ${patient.token_number}. The clinic is currently serving token ${patient.clinic?.current_token}. There are ${peopleAhead} people ahead of you.`
    });

  } catch (error) {
    console.error('Bland AI Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
