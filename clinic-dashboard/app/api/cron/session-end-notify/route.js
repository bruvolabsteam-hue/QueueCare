import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This runs as a Vercel Cron Job every 5 minutes.
// It checks if any doctor's session has just ended and notifies waiting patients.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const superAdminUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'https://queuecare-admin.vercel.app';

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    // Current time as HH:MM:SS string (local minutes don't matter, Postgres will compare)
    const nowTimeStr = now.toTimeString().slice(0, 8); // "HH:MM:SS"

    // Find doctor sessions where:
    // 1. Today's schedule
    // 2. Doctor is active (was active during the day)
    // 3. end_time is within the last 5 minutes (session just ended)
    // 4. We have NOT already sent the end-of-session notification (notified_session_end = false/null)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinAgoStr = fiveMinAgo.toTimeString().slice(0, 8);

    const { data: endedSessions, error: sessionErr } = await supabase
      .from('doctor_daily_settings')
      .select('*, doctor:doctor_id(id, name), clinic:clinic_id(id, clinic_name)')
      .eq('date', today)
      .eq('is_active', true)
      .gte('end_time', fiveMinAgoStr)   // ended no more than 5 mins ago
      .lte('end_time', nowTimeStr)      // already ended (not in the future)
      .is('notified_session_end', null); // not yet notified

    if (sessionErr) {
      console.error('Session query error:', sessionErr);
      return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    }

    if (!endedSessions || endedSessions.length === 0) {
      return NextResponse.json({ message: 'No sessions ended in the last 5 minutes. Nothing to notify.' });
    }

    let totalNotified = 0;
    const results = [];

    for (const session of endedSessions) {
      const doctorId = session.doctor_id;
      const clinicId = session.clinic_id;
      const doctorName = session.doctor?.name || 'Your doctor';

      // Find all patients for this doctor who are still waiting (not yet served)
      const startOfDay = `${today}T00:00:00`;
      const { data: waitingPatients } = await supabase
        .from('patients')
        .select('id, name, phone, token_number')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctorId)
        .in('status', ['waiting', 'skipped'])
        .gte('created_at', startOfDay);

      if (waitingPatients && waitingPatients.length > 0) {
        // Build the end-of-session message
        const clinicName = session.clinic?.clinic_name || 'the clinic';
        const sessionEndMsg = `Dear patient, Dr. ${doctorName}'s session at ${clinicName} has ended for today. Your appointment is carried forward. Please visit tomorrow or call the clinic to reschedule.`;

        for (const patient of waitingPatients) {
          try {
            // Use the existing outbound notify infrastructure
            // We send a custom direct message instead of going through the generic notify endpoint
            // because we need a custom message for session-end
            if (patient.phone) {
              // Fetch the clinic's TeleCMI caller ID
              const { data: clinic } = await supabase
                .from('clinics')
                .select('telecmi_caller_id, telecmi_api_key, telecmi_secret')
                .eq('id', clinicId)
                .single();

              if (clinic?.telecmi_caller_id) {
                // Call TeleCMI SMS API directly
                const telecmiPayload = {
                  app_id: clinic.telecmi_caller_id,
                  secret: clinic.telecmi_secret || '',
                  to: patient.phone,
                  message: sessionEndMsg,
                };

                await fetch('https://rest.telecmi.com/v2/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(telecmiPayload),
                }).catch(e => console.error('TeleCMI send error:', e));

                totalNotified++;
                console.log(`Notified patient ${patient.name} (${patient.phone}) - session ended for Dr. ${doctorName}`);
              }
            }
          } catch (err) {
            console.error(`Failed to notify patient ${patient.id}:`, err);
          }
        }
      }

      // Mark this session as notified so we don't send again
      await supabase
        .from('doctor_daily_settings')
        .update({ notified_session_end: true })
        .eq('id', session.id);

      results.push({
        doctor: doctorName,
        clinic: session.clinic?.clinic_name,
        waitingPatients: waitingPatients?.length || 0,
        notified: waitingPatients?.length || 0,
      });
    }

    return NextResponse.json({
      message: `Session-end check complete. Notified ${totalNotified} patients across ${endedSessions.length} ended sessions.`,
      results,
    });

  } catch (err) {
    console.error('End-of-session cron error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
