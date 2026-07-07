import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key to bypass RLS for server-to-server webhook
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req) {
  try {
    const body = await req.json();
    
    // The AI provider (Bland AI / Vapi) will pass these parameters
    const { 
      clinic_id, 
      patient_name, 
      caller_phone,
      doctor_name
    } = body;

    if (!clinic_id || !patient_name || !caller_phone || !doctor_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: clinic_id, patient_name, caller_phone, doctor_name' 
      }, { status: 400 });
    }

    // 0. Find the specific doctor ID from the provided name
    let doctorId = null;
    if (doctor_name) {
      const { data: doctors } = await supabase
        .from('staff')
        .select('id, name')
        .eq('clinic_id', clinic_id)
        .eq('role', 'doctor')
        .ilike('name', `%${doctor_name.trim()}%`)
        .limit(1);

      if (doctors && doctors.length > 0) {
        doctorId = doctors[0].id;
      } else {
        return NextResponse.json({ error: `Doctor not found: ${doctor_name}` }, { status: 404 });
      }
    }

    // 1. Call the database RPC to generate the token
    const { data: tokenNumber, error: rpcError } = await supabase.rpc('generate_daily_token', {
      p_clinic_id: clinic_id,
      p_name: patient_name,
      p_phone: caller_phone,
      p_registration_method: 'ivr',
      p_doctor_id: doctorId
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // 2. Calculate the estimated wait time to return to the AI
    // Get the clinic's average wait time
    const { data: clinic } = await supabase
      .from('clinics')
      .select('avg_time_per_patient_mins')
      .eq('id', clinic_id)
      .single();
      
    const avgTime = clinic?.avg_time_per_patient_mins || 10;

    // Get the number of people waiting ahead of them IN THIS DOCTOR'S QUEUE
    const today = new Date().toISOString().split('T')[0];
    const { count: waitingCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinic_id)
      .eq('doctor_id', doctorId)
      .eq('status', 'waiting')
      .lt('token_number', tokenNumber)
      .gte('created_at', today);

    const estimatedWaitMins = (waitingCount || 0) * avgTime;

    // The AI will read this JSON response back to the user
    return NextResponse.json({
      success: true,
      token_number: tokenNumber,
      estimated_wait_minutes: estimatedWaitMins,
      message_to_speak: `Thank you ${patient_name}. Your token is number ${tokenNumber}. Your estimated wait time is ${estimatedWaitMins} minutes. We have also sent you a message with these details.`
    });

  } catch (err) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
