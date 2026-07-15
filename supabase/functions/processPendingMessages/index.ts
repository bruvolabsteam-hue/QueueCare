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

    // 1. Fetch pending messages
    const { data: messages, error: msgError } = await supabase
      .from('pending_messages')
      .select('*')
      .eq('status', 'pending')
      .limit(50) // process in batches

    if (msgError) throw msgError
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch TeleCMI Master credentials from environment variables or use fallback mock tokens
    const masterAppId = Deno.env.get('TELECMI_MASTER_APP_ID') || 'mock-telecmi-app-id'
    const masterSecretKey = Deno.env.get('TELECMI_MASTER_SECRET_KEY') || 'mock-telecmi-secret-key'
    const apiBase = Deno.env.get('TELECMI_API_URL') || 'https://api.telecmi.com'

    const processMessage = async (msg) => {
      try {
        const isVoiceCall = msg.event_type.includes('call')

        if (isVoiceCall) {
          console.log(`Sending TeleCMI Voice Call to ${msg.patient_phone} using Master App ID: ${masterAppId}`)
          
          const url = `${apiBase}/v1/call/initiate`
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${masterAppId}:${masterSecretKey}`)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appid: masterAppId,
              secret: masterSecretKey,
              to: msg.patient_phone,
            }),
          })

          if (!response.ok) {
            throw new Error(`TeleCMI Voice initiation failed: ${await response.text()}`)
          }

          // Log usage for billing and deduct from Master Wallet
          await supabase.rpc('increment_usage_and_deduct_master', { 
            p_clinic_id: msg.clinic_id, 
            p_service: 'telecmi_voice' 
          })
        } else {
          console.log(`Sending TeleCMI SMS to ${msg.patient_phone} using Master App ID: ${masterAppId}`)
          
          const url = `${apiBase}/v1/sms/send`
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${masterAppId}:${masterSecretKey}`)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appid: masterAppId,
              secret: masterSecretKey,
              to: msg.patient_phone,
              text: msg.message_content,
              message: msg.message_content,
            }),
          })

          if (!response.ok) {
            throw new Error(`TeleCMI SMS sending failed: ${await response.text()}`)
          }

          // Log usage for billing and deduct from Master Wallet
          await supabase.rpc('increment_usage_and_deduct_master', { 
            p_clinic_id: msg.clinic_id, 
            p_service: 'telecmi_sms' 
          })
        }

        // Mark as sent
        await supabase
          .from('pending_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msg.id)
          
      } catch (e) {
        console.error(`Error processing message ID ${msg.id}:`, e)
        
        // Handle failure
        let newRetryCount = (msg.retry_count || 0) + 1
        let newStatus = newRetryCount >= 3 ? 'failed' : 'pending'
        
        await supabase
          .from('pending_messages')
          .update({ status: newStatus, retry_count: newRetryCount })
          .eq('id', msg.id)

        if (newStatus === 'failed') {
          // Log API failure
          await supabase.from('api_failures').insert({
            clinic_id: msg.clinic_id,
            service: msg.event_type.includes('call') ? 'telecmi_voice' : 'telecmi_sms',
            error_message: e.message
          })
        }
      }
    }

    // Run processing concurrently
    await Promise.all(messages.map(processMessage))

    return new Response(JSON.stringify({ success: true, processed: messages.length }), {
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
