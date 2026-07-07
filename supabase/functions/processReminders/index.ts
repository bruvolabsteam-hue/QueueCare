import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    // Find appointments between 23 and 25 hours from now
    const minTime24h = new Date(tomorrow.getTime() - 1 * 60 * 60 * 1000).toISOString()
    const maxTime24h = new Date(tomorrow.getTime() + 1 * 60 * 60 * 1000).toISOString()

    const { data: patients24h, error: err24h } = await supabase
      .from('patients')
      .select('*')
      .eq('reminder_24h_sent', false)
      .gte('scheduled_for', minTime24h)
      .lte('scheduled_for', maxTime24h)

    if (err24h) throw err24h

    for (const patient of patients24h || []) {
      // Send directly to the sendNotification Edge Function internally
      // Or just insert to pending_messages. Let's insert directly.
      const messageContent = patient.language === 'hi'
          ? `अनुस्मारक: कल आपका अप्वाइंटमेंट है।`
          : `Reminder: You have a scheduled appointment tomorrow.`

      await supabase.from('pending_messages').insert({
        clinic_id: patient.clinic_id,
        patient_phone: patient.phone,
        event_type: 'reminder_24h',
        message_content: messageContent,
        status: 'pending'
      })

      await supabase.from('patients').update({ reminder_24h_sent: true }).eq('id', patient.id)
    }

    // Morning reminders (e.g. today's appointments that haven't been reminded)
    // In production, this would trigger at like 7 AM.
    const startOfDay = new Date(now.setHours(0,0,0,0)).toISOString()
    const endOfDay = new Date(now.setHours(23,59,59,999)).toISOString()

    const { data: patientsMorning, error: errMorning } = await supabase
      .from('patients')
      .select('*')
      .eq('reminder_morning_sent', false)
      .gte('scheduled_for', startOfDay)
      .lte('scheduled_for', endOfDay)

    if (errMorning) throw errMorning

    for (const patient of patientsMorning || []) {
      const messageContent = patient.language === 'hi'
          ? `सुप्रभात! आज आपका अप्वाइंटमेंट है। आपका टोकन ${patient.token_number} है।`
          : `Good morning! You have an appointment today. Your token is ${patient.token_number}.`

      await supabase.from('pending_messages').insert({
        clinic_id: patient.clinic_id,
        patient_phone: patient.phone,
        event_type: 'reminder_morning',
        message_content: messageContent,
        status: 'pending'
      })

      await supabase.from('patients').update({ reminder_morning_sent: true }).eq('id', patient.id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed24h: patients24h?.length || 0,
      processedMorning: patientsMorning?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
