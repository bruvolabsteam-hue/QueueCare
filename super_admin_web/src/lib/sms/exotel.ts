import { supabaseAdmin } from '../supabase-admin';

/**
 * Sends a fallback SMS to a patient via Exotel
 */
export async function sendExotelSMS(toPhoneNumber: string, messageText: string, clinicCallerId: string) {
  // 1. Fetch Exotel credentials from the database
  const { data: settings, error } = await supabaseAdmin
    .from('global_settings')
    .select('exotel_account_sid, voice_api_key')
    .limit(1)
    .single();

  if (error || !settings?.exotel_account_sid || !settings?.voice_api_key) {
    console.error("Exotel Configuration Error: Missing SID or API Key");
    return false;
  }

  const sid = settings.exotel_account_sid;
  
  // Format is API_KEY:API_TOKEN
  const [apiKey, apiToken] = settings.voice_api_key.split(':');
  
  if (!apiKey || !apiToken) {
    console.error("Exotel Configuration Error: Invalid voice_api_key format. Must be KEY:TOKEN");
    return false;
  }

  // Format the phone number to remove '+' if present
  const formattedPhone = toPhoneNumber.replace('+', '');
  const formattedCallerId = clinicCallerId.replace('+', '');

  try {
    const authString = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
    
    // Exotel SMS API Endpoint
    const url = `https://api.exotel.com/v1/Accounts/${sid}/Sms/send.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', formattedCallerId);
    formData.append('To', formattedPhone);
    formData.append('Body', messageText);
    // DLT Template ID should be appended here in a real production environment
    // formData.append('DltEntityId', 'your_dlt_entity_id');
    // formData.append('DltTemplateId', 'your_dlt_template_id');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Exotel API Error:", responseData);
      return false;
    }

    console.log(`Exotel SMS sent successfully to ${formattedPhone}`);
    return true;
  } catch (err) {
    console.error("Exotel Network Error:", err);
    return false;
  }
}
