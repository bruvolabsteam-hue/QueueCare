import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint should be called periodically (e.g., every 5 mins) via a cron job
export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // 1. Get all active clinics and their avg wait times
    const { data: clinics } = await supabase.from('clinics').select('id, avg_time_per_patient_mins, regional_language, name, phone');
    if (!clinics) return NextResponse.json({ success: true, message: 'No clinics found' });

    let optimizedCount = 0;

    for (const clinic of clinics) {
      const avgTime = clinic.avg_time_per_patient_mins || 10;

      // 2. Get active doctors for today in this clinic
      const { data: activeSettings } = await supabase
        .from('doctor_daily_settings')
        .select('doctor_id, doctor:staff!doctor_id(name)')
        .eq('clinic_id', clinic.id)
        .eq('date', today)
        .eq('is_active', true);

      const activeDoctors = activeSettings || [];

      // 3. For each doctor, evaluate the queue
      for (const settings of activeDoctors) {
        const doctorId = settings.doctor_id;
        const doctorName = settings.doctor?.name || 'the doctor';

        // Fetch all waiting patients for this doctor today, ordered by token_number
        const { data: waitingPatients } = await supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', clinic.id)
          .eq('doctor_id', doctorId)
          .eq('status', 'waiting')
          .gte('created_at', today)
          .order('token_number', { ascending: true });

        if (!waitingPatients || waitingPatients.length === 0) continue;

        // Calculate estimated wait time for each patient
        for (let i = 0; i < waitingPatients.length; i++) {
          const patient = waitingPatients[i];
          const estimatedWaitMins = i * avgTime;

          // If they are <= 15 mins away and haven't been contacted yet
          if (estimatedWaitMins <= 15 && (!patient.outbound_status || patient.outbound_status === 'none')) {
            // Mark as calling to prevent duplicate cron triggers
            await supabase
              .from('patients')
              .update({ 
                outbound_status: 'calling', 
                outbound_called_at: new Date().toISOString() 
              })
              .eq('id', patient.id);

            // TODO: Trigger Bland AI Voice Call here
            // const callResponse = await triggerVoiceCall({ ... });

            // TODO: Trigger WhatsApp Message here
            const messageContent = `Hi ${patient.name}, this is ${clinic.name}. Your appointment with ${doctorName} is in approximately ${estimatedWaitMins} minutes. Please reply YES to confirm you are on your way, or NO to cancel.`;
            
            await supabase.from('pending_messages').insert({
              clinic_id: clinic.id,
              patient_phone: patient.phone,
              event_type: 'outbound_reminder',
              message_content: messageContent,
              platform: 'whatsapp',
              status: 'pending'
            });

            optimizedCount++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, optimized_patients: optimizedCount });

  } catch (err) {
    console.error('Queue Optimizer Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
