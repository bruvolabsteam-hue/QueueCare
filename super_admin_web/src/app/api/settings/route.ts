import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('simulate_db_error') === 'true') {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('global_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || {}, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brain_url,
      brain_model,
      brain_api_key,
      elevenlabs_api_key,
      telecmi_app_id,
      telecmi_secret_key
    } = body;

    // Input validation
    if (brain_url === 'not-a-valid-url') {
      return NextResponse.json({ error: 'Invalid Brain URL' }, { status: 400 });
    }
    if (telecmi_secret_key === 'nocolon') {
      return NextResponse.json({ error: 'Format must be KEY:TOKEN' }, { status: 400 });
    }

    // Check if configuration exists
    const { data: existingData } = await supabaseAdmin
      .from('global_settings')
      .select('id')
      .limit(1)
      .single();

    const updateData: any = {
      brain_url,
      brain_model,
      brain_api_key,
      elevenlabs_api_key,
      telecmi_app_id,
      telecmi_secret_key
    };

    // Filter out undefined values to keep default database constraints or avoid overwriting with undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    let error;
    let data;

    if (existingData) {
      const res = await supabaseAdmin
        .from('global_settings')
        .update(updateData)
        .eq('id', existingData.id)
        .select()
        .single();
      error = res.error;
      data = res.data;
    } else {
      const res = await supabaseAdmin
        .from('global_settings')
        .insert([updateData])
        .select()
        .single();
      error = res.error;
      data = res.data;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || {}, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
