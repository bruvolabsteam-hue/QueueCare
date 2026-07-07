import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Call the database RPC which securely checks the Master Wallet balances
    // and automatically queues an SMS/WhatsApp alert if it's below the threshold
    const { error } = await supabase.rpc('check_and_alert_master_wallet');
    
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: "Master Wallet checked successfully." }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: { 'Content-Type': 'application/json' } 
    })
  }
})

