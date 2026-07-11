import { supabaseAdmin } from '../supabase-admin';

export async function generatePatientResponse(
  message: string, 
  patientData: any, 
  clinicData: any
) {
  // 1. Fetch the master configuration from the database
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('ollama_url')
    .limit(1)
    .single();

  const ollamaUrl = settings?.ollama_url || 'http://127.0.0.1:11434';

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

  try {
    const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      console.error("Ollama API Error:", ollamaResponse.statusText);
      return "I am experiencing technical difficulties. Please check back later.";
    }

    const data = await ollamaResponse.json();
    return data.message?.content || "I am experiencing technical difficulties. Please check back later.";
  } catch (err) {
    console.error("Ollama Generation Error:", err);
    return "I am experiencing technical difficulties. Please check back later.";
  }
}

