import { supabaseAdmin } from '../supabase-admin';

/**
 * Sends a SMS to a patient via TeleCMI
 */
export async function sendTeleCMIMessage(toPhoneNumber: string, messageText: string, clinicCallerId: string) {
  // 1. Fetch settings from global_settings
  const { data: settings, error } = await supabaseAdmin
    .from('global_settings')
    .select('telecmi_app_id, telecmi_secret_key')
    .limit(1)
    .single();

  if (error || !settings?.telecmi_app_id || !settings?.telecmi_secret_key) {
    console.error("TeleCMI Configuration Error: Missing appid or secret_key");
    return false;
  }

  const appid = settings.telecmi_app_id;
  const secret = settings.telecmi_secret_key;

  try {
    const apiBase = process.env.TELECMI_API_URL || 'https://api.telecmi.com';
    const url = `${apiBase}/v1/sms/send`;

    // Support both header basic auth and body parameters
    const authString = Buffer.from(`${appid}:${secret}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appid,
        secret,
        to: toPhoneNumber,
        text: messageText,
        message: messageText,
        sender: clinicCallerId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TeleCMI API Error:", errorText);
      return false;
    }

    console.log(`TeleCMI SMS sent successfully to ${toPhoneNumber}`);
    return true;
  } catch (err) {
    console.error("TeleCMI Network Error:", err);
    return false;
  }
}
