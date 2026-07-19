import { supabaseAdmin } from '../supabase-admin';

export async function generatePatientResponse(
  message: string, 
  patientData: any, 
  clinicData: any
) {
  // 1. Fetch the master configuration from the database
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('brain_url, brain_model, brain_api_key, groq_url, groq_model, groq_api_key, claude_url, claude_model, claude_api_key, active_brain_provider')
    .limit(1)
    .single();

  if (!settings) {
    return "Please consult reception. No configuration found.";
  }

  let brainUrl = settings.brain_url;
  let brainModel = settings.brain_model || 'llama-3.1-8b-instant';
  let brainApiKey = settings.brain_api_key;

  if (settings.active_brain_provider === 'groq') {
    brainUrl = settings.groq_url || brainUrl;
    brainModel = settings.groq_model || brainModel;
    brainApiKey = settings.groq_api_key || brainApiKey;
  } else if (settings.active_brain_provider === 'claude') {
    brainUrl = settings.claude_url || brainUrl;
    brainModel = settings.claude_model || brainModel;
    brainApiKey = settings.claude_api_key || brainApiKey;
  }

  if (!brainUrl) {
    return "Please consult reception. No AI provider URL configured.";
  }

  // 1.5 Calculate current serving token for the same doctor
  const { data: currentPatient } = await supabaseAdmin
    .from('patients')
    .select('token_number')
    .eq('clinic_id', patientData.clinic_id)
    .eq('doctor_id', patientData.doctor_id)
    .eq('status', 'called')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  const currentToken = currentPatient ? currentPatient.token_number : 'Unknown';

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
- Currently Serving Token: ${currentToken}
- Clinic Address: ${clinicData?.address || 'Unknown'}

INSTRUCTIONS:
1. Be extremely concise (1-2 sentences maximum, this is a WhatsApp/Voice message).
2. Answer the user's question accurately based ONLY on the data above.
3. If they ask how many people are ahead of them, subtract the current token from their token.
4. Auto-detect the language the patient is speaking/typing and reply in the EXACT SAME language. If you cannot detect the language, you MUST reply in the default regional language: "${clinicData?.regional_language || 'English'}".
5. Do not use complex formatting like bold, italics, or markdown. Output plain text only.`;

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
    } else if (brainUrl.includes('anthropic.com')) {
      endpoint = brainUrl; // use exactly as provided, usually https://api.anthropic.com/v1/messages
      headers['x-api-key'] = brainApiKey;
      headers['anthropic-version'] = '2023-06-01';
      // Anthropic does not use Bearer in Authorization usually, but we keep it or override
      delete headers['Authorization'];
    } else {
      endpoint = brainUrl.endsWith('/') ? `${brainUrl}chat/completions` : `${brainUrl}/chat/completions`;
    }

    let payload: any = {};
    if (brainUrl.includes('anthropic.com')) {
      payload = {
        model: brainModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ],
        stream: false
      };
    } else {
      payload = {
        model: brainModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false
      };
    }

    const brainResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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
    } else if (data.content && data.content[0] && data.content[0].text) {
      reply = data.content[0].text;
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

