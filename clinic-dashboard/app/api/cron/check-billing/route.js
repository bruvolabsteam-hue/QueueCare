import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This forces Next.js to not cache this route so it runs fresh every time Vercel triggers the cron
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Connect to Supabase as an Admin to read the secure table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch the keys from global_settings
    const { data: settings, error: dbError } = await supabase
      .from('global_settings')
      .select('brain_url, brain_model, brain_api_key')
      .limit(1)
      .single();

    if (dbError || !settings || !settings.brain_api_key) {
      return NextResponse.json({ status: 'error', message: 'No Brain API key found in vault.' });
    }

    const brainUrl = settings.brain_url || 'https://api.groq.com/openai/v1';
    const brainModel = settings.brain_model || 'llama-3.1-8b-instant';
    const brainApiKey = settings.brain_api_key;
    
    // 3. Ping Brain API to see if the key has balance remaining
    const endpoint = brainUrl.endsWith('/') ? `${brainUrl}chat/completions` : `${brainUrl}/chat/completions`;
    const brainRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${brainApiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: brainModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      })
    });

    const brainData = await brainRes.json();
    let isBalanceLow = false;
    let alertMessage = '';

    // Check if Brain API rejected it due to billing/auth
    if (!brainRes.ok) {
      if (brainData?.error?.code === 'insufficient_quota' || brainRes.status === 402 || brainRes.status === 429) {
        isBalanceLow = true;
        alertMessage = "🚨 *Critical Alert*: Your Groq Brain API balance has run out or hit its limit! Please refill immediately to prevent the Live Queue from going offline.";
      } else if (brainData?.error?.type === 'authentication_error' || brainRes.status === 401) {
        isBalanceLow = true;
        alertMessage = "🚨 *Security Alert*: Your Groq Brain API key in the Super Admin Vault is invalid or was revoked.";
      }
    }

    // 4. Queue system alert message if there is an issue
    if (isBalanceLow) {
      const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('super_admin_phone')
        .limit(1)
        .single();

      const adminPhone = platformSettings?.super_admin_phone;

      if (adminPhone) {
        // Insert into pending_messages if not already exists to avoid spam
        const { data: existing } = await supabase
          .from('pending_messages')
          .select('id')
          .eq('patient_phone', adminPhone)
          .eq('message_content', alertMessage)
          .eq('status', 'pending')
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('pending_messages').insert({
            clinic_id: null,
            patient_phone: adminPhone,
            event_type: 'system_alert',
            message_content: alertMessage,
            status: 'pending'
          });
        }
      }
      
      return NextResponse.json({ status: 'alert_queued', message: alertMessage });
    }

    return NextResponse.json({ status: 'ok', message: 'Brain API key is healthy and active. No alert needed.' });
    
  } catch (err) {
    console.error('Cron job failed:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
