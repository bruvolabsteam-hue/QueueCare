/* eslint-disable */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    // Initialize inside the handler to prevent Vercel build-time crashes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase Environment Variables for Voice API');
    }
    
    const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder');
    
    const body = await req.json();
    const { clinic_id } = body;

    if (!clinic_id) {
      return NextResponse.json({ error: 'Missing clinic_id' }, { status: 400 });
    }

    // Fetch doctors for this clinic
    const { data: doctors, error } = await supabase
      .from('staff')
      .select('name')
      .eq('clinic_id', clinic_id)
      .eq('role', 'doctor');

    if (error) {
      throw error;
    }

    if (!doctors || doctors.length === 0) {
      return NextResponse.json({ 
        success: true,
        doctors: [],
        message_to_speak: "Sorry, there are no doctors available at this clinic right now."
      });
    }

    // Create a comma-separated list of doctor names to read to the user
    const doctorNames = doctors.map(d => d.name).join(' or ');

    return NextResponse.json({
      success: true,
      doctors: doctors,
      available_doctors_speech: `We have ${doctorNames} available. Which doctor would you like to see?`
    });

  } catch (err) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
