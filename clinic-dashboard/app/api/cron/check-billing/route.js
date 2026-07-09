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
      .select('anthropic_api_key, whatsapp_api_key, support_whatsapp_number')
      .limit(1)
      .single();

    if (dbError || !settings || !settings.anthropic_api_key) {
      return NextResponse.json({ status: 'error', message: 'No Anthropic API key found in vault.' });
    }

    const anthropicKey = settings.anthropic_api_key;
    const adminPhone = settings.support_whatsapp_number;
    
    // 3. Ping Anthropic API to see if the key has balance remaining
    // Since Anthropic doesn't have a direct "balance" endpoint, we attempt a tiny 1-token request.
    // If it returns a 429 quota error, we know the balance is empty.
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      })
    });

    const anthropicData = await anthropicRes.json();
    let isBalanceLow = false;
    let alertMessage = '';

    // Check if Anthropic rejected it due to billing
    if (!anthropicRes.ok) {
      if (anthropicData?.error?.type === 'insufficient_quota' || anthropicRes.status === 402 || anthropicRes.status === 429) {
        isBalanceLow = true;
        alertMessage = "🚨 *Critical Alert*: Your Claude Haiku API balance has run out or hit its limit! Please refill immediately at console.anthropic.com to prevent the Live Queue from going offline.";
      } else if (anthropicData?.error?.type === 'authentication_error') {
        isBalanceLow = true;
        alertMessage = "🚨 *Security Alert*: Your Claude Haiku API key in the Super Admin Vault is invalid or was revoked.";
      }
    }

    // 4. Send WhatsApp Alert if there is an issue
    if (isBalanceLow && adminPhone && settings.whatsapp_api_key) {
      // Assuming a generic WhatsApp Cloud API endpoint (adjust to actual provider later)
      // We will console.log here and return the payload so we can test it locally
      console.log(`Sending WhatsApp alert to ${adminPhone}:`, alertMessage);
      
      /* Example WhatsApp Cloud API Call:
      await fetch(`https://graph.facebook.com/v17.0/YOUR_PHONE_ID/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${settings.whatsapp_api_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: adminPhone, text: { body: alertMessage } })
      });
      */
      
      return NextResponse.json({ status: 'alert_sent', message: alertMessage });
    }

    return NextResponse.json({ status: 'ok', message: 'API key is healthy and active. No alert needed.' });
    
  } catch (err) {
    console.error('Cron job failed:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
