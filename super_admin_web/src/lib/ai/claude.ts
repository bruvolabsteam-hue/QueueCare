import { supabaseAdmin } from '../supabase-admin';

export async function generatePatientResponse(
  message: string, 
  patientData: any, 
  clinicData: any
) {
  // 1. Fetch the master configuration from the database
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('brain_url, brain_model, brain_api_key')
    .limit(1)
    .single();

  if (!settings || !settings.brain_url) {
    return "Please consult reception. No configuration found.";
  }

  const brainUrl = settings.brain_url;
  const brainModel = settings.brain_model || 'llama-3.1-8b-instant';
  const brainApiKey = settings.brain_api_key;

  // 2. Construct the system prompt using the database information
  let systemPrompt = `You are an intelligent, polite AI receptionist for ${clinicData?.clinic_name || 'BruvoFlow Clinic'}. 
Your job is to answer the patient's question based strictly on their live queue data below.
If they ask something unrelated, politely bring the conversation back to their appointment.

PATIENT DATA:
- Name: ${patientData?.name || 'Patient'}
- Token Number: ${patientData?.token_number || 'Unknown'}
- Status: ${patientData?.status || 'Unknown'}
- Expected Time: ${patientData?.expected_time || 'Unknown'}

CLINIC DATA:
- Currently Serving Token: ${clinicData?.current_token || 'Unknown'}
- Clinic Address: ${clinicData?.address || 'Unknown'}

INSTRUCTIONS:
1. Be extremely concise (1-2 sentences maximum, this is a WhatsApp message).
2. Answer the user's question accurately based ONLY on the data above.
3. If they ask how many people are ahead of them, subtract the current token from their token.
4. Do not use complex formatting.`;

  if (message === 'simulate timeout') {
    return "Our wait time update is temporarily unavailable. Please stay on the line.";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    if (brainApiKey) {
      headers['Authorization'] = `Bearer ${brainApiKey}`;
    }

    let endpoint = '';
    if (brainUrl.includes('127.0.0.1') || brainUrl.includes('localhost') || brainUrl.includes('/api/chat')) {
      endpoint = brainUrl.endsWith('/') ? `${brainUrl}api/chat` : `${brainUrl}/api/chat`;
    } else {
      endpoint = brainUrl.endsWith('/') ? `${brainUrl}chat/completions` : `${brainUrl}/chat/completions`;
    }

    const brainResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: brainModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!brainResponse.ok) {
      console.error("Brain API Error:", brainResponse.statusText);
      return "Currently we are experiencing system maintenance. Please consult reception.";
    }

    const data = await brainResponse.json();
    let reply = "";
    if (data.choices && data.choices[0] && data.choices[0].message) {
      reply = data.choices[0].message.content;
    } else if (data.message && data.message.content) {
      reply = data.message.content;
    } else {
      reply = "Currently we are experiencing system maintenance. Please consult reception.";
    }
    return reply.substring(0, 4096);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || controller.signal.aborted) {
      return "Our wait time update is temporarily unavailable. Please stay on the line.";
    }
    console.error("Brain Generation Error:", err);
    return "Currently we are experiencing system maintenance. Please consult reception.";
  }
}

