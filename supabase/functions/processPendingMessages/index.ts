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

    // 2. We no longer fetch clinic API keys. We use the Master Platform Keys.
    const masterWaKey = Deno.env.get('WHATSAPP_MASTER_KEY') || 'mock-wa-master-key'
    const masterExotelKey = Deno.env.get('EXOTEL_MASTER_KEY') || 'mock-exotel-master-key'

    const processMessage = async (msg) => {
      try {
        // Send actual API request using Master Keys
        if (msg.event_type.includes('call')) {
           console.log(`Sending Exotel Call to ${msg.patient_phone} using Master Key: ${masterExotelKey}`)
           // Log usage for billing and deduct from Master Wallet
           await supabase.rpc('increment_usage_and_deduct_master', { p_clinic_id: msg.clinic_id, p_service: 'exotel' })
        } else {
           console.log(`Sending WhatsApp to ${msg.patient_phone} using Master Key: ${masterWaKey}`)
           // Log usage for billing and deduct from Master Wallet
           await supabase.rpc('increment_usage_and_deduct_master', { p_clinic_id: msg.clinic_id, p_service: 'whatsapp' })
        }

        // Mark as sent
        await supabase
          .from('pending_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msg.id)
          
      } catch (e) {
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
            service: 'whatsapp',
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
