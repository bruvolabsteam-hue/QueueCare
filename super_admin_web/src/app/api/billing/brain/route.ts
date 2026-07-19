import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // 1. Fetch AI Brain configuration
    const { data: settings } = await supabaseAdmin
      .from('global_settings')
      .select('active_brain_provider, groq_api_key, groq_url, groq_model, claude_api_key, claude_url, claude_model, brain_url, brain_model, brain_api_key')
      .limit(1)
      .single();

    if (!settings) {
      return NextResponse.json({ error: 'Settings not configured.' }, { status: 400 });
    }

    let provider = settings.active_brain_provider || 'generic';
    let apiKey = settings.brain_api_key;
    let endpoint = settings.brain_url;
    let model = settings.brain_model;

    if (provider === 'groq') {
      apiKey = settings.groq_api_key || apiKey;
      endpoint = settings.groq_url || endpoint;
      model = settings.groq_model || model;
    } else if (provider === 'claude') {
      apiKey = settings.claude_api_key || apiKey;
      endpoint = settings.claude_url || endpoint;
      model = settings.claude_model || model;
    }

    if (!apiKey || !endpoint) {
       return NextResponse.json({ error: 'API key or endpoint not configured.' }, { status: 400 });
    }

    // 2. Perform a ping to extract rate limit headers (which acts as a proxy for available capacity/tokens)
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    let fetchUrl = endpoint;
    let body = {};
    
    if (provider === 'claude' || endpoint.includes('anthropic')) {
      fetchUrl = endpoint;
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      };
    } else {
      fetchUrl = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      };
    }

    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
       return NextResponse.json({ error: `Provider returned error: ${res.statusText}` }, { status: res.status });
    }

    // Extract headers for token/request limits
    let tokensRemaining = 'Unknown';
    let requestsRemaining = 'Unknown';

    if (provider === 'groq' || endpoint.includes('groq')) {
      tokensRemaining = res.headers.get('x-ratelimit-remaining-tokens') || 'Unknown';
      requestsRemaining = res.headers.get('x-ratelimit-remaining-requests') || 'Unknown';
    } else if (provider === 'claude' || endpoint.includes('anthropic')) {
      tokensRemaining = res.headers.get('anthropic-ratelimit-tokens-remaining') || 'Unknown';
      requestsRemaining = res.headers.get('anthropic-ratelimit-requests-remaining') || 'Unknown';
    } else {
       // generic OpenAI compatible
       tokensRemaining = res.headers.get('x-ratelimit-remaining-tokens') || 'Unknown';
       requestsRemaining = res.headers.get('x-ratelimit-remaining-requests') || 'Unknown';
    }

    return NextResponse.json({
      provider: provider.toUpperCase(),
      model: model,
      status: 'Active',
      tokens_remaining: tokensRemaining,
      requests_remaining: requestsRemaining
    });

  } catch (error: any) {
    console.error('Brain Billing Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
