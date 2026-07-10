import { supabaseAdmin } from '../supabase-admin';

/**
 * Sends a text message to a patient via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(toPhoneNumber: string, messageText: string) {
  // 1. Fetch WhatsApp credentials from the database
  const { data: settings, error } = await supabaseAdmin
    .from('global_settings')
    .select('whatsapp_api_key, support_whatsapp_number')
    .limit(1)
    .single();

  if (error || !settings?.whatsapp_api_key) {
    console.error("WhatsApp Configuration Error: Missing API Key");
    return false;
  }

  // 2. We need the WhatsApp Phone Number ID. For a multi-tenant app, 
  // you either store the exact Phone Number ID in global_settings, 
  // or you make the API call using the Graph API.
  // We'll assume the environment variable holds the WABA Phone Number ID for now.
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!phoneNumberId) {
    console.error("WhatsApp Configuration Error: Missing WHATSAPP_PHONE_NUMBER_ID env var");
    return false;
  }

  // Format the phone number to remove '+' if present
  const formattedPhone = toPhoneNumber.replace('+', '');

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.whatsapp_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: messageText
        }
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", responseData);
      return false;
    }

    return true;
  } catch (err) {
    console.error("WhatsApp Network Error:", err);
    return false;
  }
}
