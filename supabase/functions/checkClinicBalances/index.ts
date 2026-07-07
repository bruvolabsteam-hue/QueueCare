import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: keys, error } = await supabase.from('clinic_api_keys').select('*').eq('service', 'exotel')
    if (error) throw error
    
    let alerted = 0;

    for (const key of keys || []) {
      // Mock API call to Exotel to check balance
      const balance = Math.random() * 100; 
      
      if (balance < 20) {
        await supabase.from('low_balance_alerts').insert({
          clinic_id: key.clinic_id,
          service: 'exotel',
          balance_amount: balance,
          status: 'active'
        })
        alerted++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed: keys?.length || 0, alerted }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: { 'Content-Type': 'application/json' } 
    })
  }
})
