import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST: Handle incoming Bland AI Tool Calls
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bland AI usually sends the caller's phone number and the tool arguments
    const { phone_number, to_number } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    console.log(`Bland AI checking queue for: ${phone_number} (dialed: ${to_number})`);

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
      // 3. If patient is NOT found (New Patient), try to figure out which clinic they called
      let clinicName = "the clinic";
      if (to_number) {
        const { data: clinicData } = await supabaseAdmin
          .from('clinics')
          .select('clinic_name')
          .eq('telecmi_caller_id', to_number)
          .limit(1)
          .single();
        
        if (clinicData) {
          clinicName = clinicData.clinic_name;
        }
      }

      return NextResponse.json({ 
        has_appointment: false,
        clinic_name: clinicName,
        message: `Welcome to ${clinicName}. I don't see an active appointment for you right now.`
      });
    }

    // 4. Return the exact data Bland AI needs to speak to the existing patient
    const peopleAhead = Math.max(0, patient.token_number - (patient.clinic?.current_token || 0));

    return NextResponse.json({
      has_appointment: true,
      patient_name: patient.name,
      token_number: patient.token_number,
      currently_serving: patient.clinic?.current_token,
      people_ahead: peopleAhead,
      clinic_name: patient.clinic?.clinic_name,
      message: `Your token number is ${patient.token_number}. The clinic is currently serving token ${patient.clinic?.current_token}. There are ${peopleAhead} people ahead of you.`
    });

  } catch (error) {
    console.error('Bland AI Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
