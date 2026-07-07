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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { event, payload } = await req.json()
    const { clinic_id, phone, language = 'en', token_number, patient_name, queue_position } = payload

    let messageContent = ''

    // Map events to multilingual messages
    switch(event) {
      case 'token_assigned':
        messageContent = language === 'hi' 
          ? `नमस्ते ${patient_name}, आपका टोकन नंबर ${token_number} है।`
          : `Hello ${patient_name}, your token number is ${token_number}.`
        break;
      case 'alert_3ahead':
        messageContent = language === 'hi' 
          ? `कृपया तैयार रहें। आपके आगे केवल 3 मरीज़ हैं।`
          : `Please be ready. There are only 3 patients ahead of you.`
        break;
      case 'reminder_24h':
        messageContent = language === 'hi'
          ? `अनुस्मारक: कल आपका अप्वाइंटमेंट है।`
          : `Reminder: You have a scheduled appointment tomorrow.`
        break;
      case 'reminder_morning':
        messageContent = language === 'hi'
          ? `सुप्रभात! आज आपका अप्वाइंटमेंट है। आपका टोकन ${token_number} है और कतार में स्थान ${queue_position} है।`
          : `Good morning! You have an appointment today. Your token is ${token_number} and current position is ${queue_position}.`
        break;
      default:
        messageContent = `Notification: ${event}`
    }

    // Insert into pending_messages
    const { data, error } = await supabase
      .from('pending_messages')
      .insert({
        clinic_id,
        patient_phone: phone,
        event_type: event,
        message_content: messageContent,
        status: 'pending'
      })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), {
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
