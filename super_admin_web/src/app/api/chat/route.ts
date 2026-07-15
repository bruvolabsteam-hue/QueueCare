import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePatientResponse } from '@/lib/ai/claude';

export async function POST(req: NextRequest) {
  try {
    let phone_number = '';
    let message = '';

    try {
      const body = await req.json();
      phone_number = body.phone_number || '';
      message = body.message || '';
    } catch (parseErr) {
      console.error('Failed to parse JSON body:', parseErr);
    }

    const searchPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('*, clinic:clinics(*)')
      .eq('phone_number', searchPhone)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Patient query failed/returned no data:', error);
    }

    // Gracefully handle situations where patient or clinic queries fail/return no data
    // by passing empty/fallback objects to generatePatientResponse
    const patientData = patient || {};
    const clinicData = patient?.clinic || {};

    const reply = await generatePatientResponse(message, patientData, clinicData);

    return NextResponse.json({ reply }, { status: 200 });
  } catch (err: any) {
    console.error('Error in chat API route:', err);
    return NextResponse.json({
      reply: 'Currently we are experiencing system maintenance. Please consult reception.'
    }, { status: 200 });
  }
}
