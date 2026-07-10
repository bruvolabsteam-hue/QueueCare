import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../supabase-admin';

export async function generatePatientResponse(
  message: string, 
  patientData: any, 
  clinicData: any
) {
  // 1. Fetch the master configuration from the database
  const { data: settings, error } = await supabaseAdmin
    .from('global_settings')
    .select('anthropic_api_key, claude_model_version')
    .limit(1)
    .single();

  if (error || !settings?.anthropic_api_key) {
    console.error("AI Configuration Error: Missing Anthropic API Key");
    return "I am currently unable to check the queue. Please contact the clinic directly.";
  }

  const anthropic = new Anthropic({
    apiKey: settings.anthropic_api_key,
  });

  const modelVersion = settings.claude_model_version || 'claude-3-haiku-20240307';

  // 2. Construct the system prompt using the database information
  let systemPrompt = `You are an intelligent, polite AI receptionist for ${clinicData?.name || 'BruvoFlow Clinic'}. 
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
    const response = await anthropic.messages.create({
      model: modelVersion,
      max_tokens: 150,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ]
    });

    // @ts-ignore - The response type structure guarantees content[0].text for text blocks
    return response.content[0].text;
  } catch (err) {
    console.error("Claude Generation Error:", err);
    return "I am experiencing technical difficulties. Please check back later.";
  }
}
