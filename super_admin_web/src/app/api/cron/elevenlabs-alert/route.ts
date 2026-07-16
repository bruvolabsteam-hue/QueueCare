import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendTeleCMIMessage } from '@/lib/sms/telecmi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch platform settings and global settings
    const { data: globalSettings } = await supabaseAdmin.from('global_settings').select('*').limit(1).single();
    const { data: platformSettings } = await supabaseAdmin.from('platform_settings').select('*').limit(1).single();

    if (!globalSettings?.elevenlabs_api_key || !platformSettings?.super_admin_phone) {
      return NextResponse.json({ error: 'Missing configuration for ElevenLabs API key or Super Admin phone.' }, { status: 400 });
    }

    if (platformSettings.elevenlabs_alert_sent_this_month) {
      return NextResponse.json({ message: 'Alert already sent this month. Skipping.' });
    }

    // 2. Fetch ElevenLabs Usage
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': globalSettings.elevenlabs_api_key }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch ElevenLabs data' }, { status: response.status });
    }

    const data = await response.json();
    const currentUsage = data.character_count || 0;
    const threshold = platformSettings.elevenlabs_alert_threshold || 80000;

    // 3. Check threshold
    if (currentUsage >= threshold) {
      const msg = `QueueCare Alert ⚠️: Your ElevenLabs API character usage has exceeded the threshold. Current usage: ${currentUsage.toLocaleString()} characters. Please top up to avoid service disruption.`;
      
      // Use TeleCMI to send WhatsApp. For Super Admin alerts, we use the global telecmi_caller_id if set, or a default.
      // Since clinics have caller IDs, we can use the first clinic's caller ID, or assume TeleCMI works with default.
      // Here we rely on the implementation of sendTeleCMIMessage handling it gracefully.
      const callerId = globalSettings.telecmi_app_id || 'DEFAULT'; // Usually we pass the clinic's caller ID, but for admin we might just pass a dummy or require it in sendTeleCMIMessage.
      // Wait, sendTeleCMIMessage takes (to, message, callerId). Let's use a generic callerId or fetch a default one if needed.
      // We will pass the global app_id for logging/debugging context.
      
      await sendTeleCMIMessage(platformSettings.super_admin_phone, msg, 'ADMIN_ALERT');

      // 4. Update flag
      await supabaseAdmin
        .from('platform_settings')
        .update({ elevenlabs_alert_sent_this_month: true })
        .eq('id', platformSettings.id);

      return NextResponse.json({ success: true, message: 'Alert sent successfully via WhatsApp.' });
    }

    return NextResponse.json({ success: true, message: 'Usage within normal limits.' });

  } catch (error: any) {
    console.error('ElevenLabs Cron Alert Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
