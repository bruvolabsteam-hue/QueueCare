import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ============================================================================
// TELECMI PIOPIY VOICE WEBHOOK (PCMO JSON FORMAT)
// ============================================================================
// TeleCMI uses PCMO (PIOPIY Call Management Objects) - JSON arrays, NOT XML.
// When a call comes in, TeleCMI POSTs to this URL with { from, to, cmiuuid }.
// We respond with a JSON array of actions like [{ action: "speak", text: "..." }].
// ============================================================================

function createPCMOResponse(actions: any[]) {
  return NextResponse.json(actions, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  try {
    // 1. Extract caller info from TeleCMI's POST body
    //    TeleCMI sends: { from: "919100000000", to: "4471000000", cmiuuid: "...", time: ... }
    let from = '';
    let to = '';

    // Try query params first (for GET requests or testing)
    const url = new URL(req.url);
    from = url.searchParams.get('from') || url.searchParams.get('From') || '';
    to = url.searchParams.get('to') || url.searchParams.get('To') || '';

    // Then try POST body
    if (req.method === 'POST') {
      try {
        // Read raw body text first for debugging
        const rawBody = await req.text();
        const contentType = req.headers.get('content-type') || '';
        console.log('TeleCMI Content-Type:', contentType);
        console.log('TeleCMI Raw Body:', rawBody);

        // Try to parse the body
        let parsed = false;

        // Attempt 1: Try JSON parsing
        if (!parsed) {
          try {
            const body = JSON.parse(rawBody);
            console.log('Parsed as JSON:', JSON.stringify(body));
            // TeleCMI uses "caller_id" for the caller's number
            from = (body.caller_id || body.from || body.From || body.cid || '').toString();
            to = (body.to || body.To || body.did || '').toString();
            parsed = true;
          } catch { /* not JSON */ }
        }

        // Attempt 2: Try URL-encoded form data
        if (!parsed && rawBody.includes('=')) {
          try {
            const params = new URLSearchParams(rawBody);
            const formFrom = params.get('caller_id') || params.get('from') || params.get('From') || params.get('cid') || '';
            const formTo = params.get('to') || params.get('To') || '';
            if (formFrom) {
              from = formFrom;
              to = formTo;
              parsed = true;
              console.log('Parsed as form-encoded');
            }
          } catch { /* not form-encoded */ }
        }

        // Attempt 3: Try to extract numbers from raw text using regex
        if (!parsed && rawBody) {
          const callerMatch = rawBody.match(/caller_id[=:]["']?(\d+)/i);
          const fromMatch = rawBody.match(/from[=:]["']?(\d+)/i);
          if (callerMatch) from = callerMatch[1];
          else if (fromMatch) from = fromMatch[1];
          console.log('Parsed with regex fallback');
        }
      } catch (err) {
        console.error('Failed to parse POST body:', err);
      }
    }

    console.log(`Voice webhook called. From: ${from}, To: ${to}`);

    // 2. If no caller number, return a generic greeting
    if (!from) {
      return createPCMOResponse([
        { action: "speak", text: "Welcome to QueueCare. We could not identify your phone number. Please contact reception directly." },
        { action: "hangup" }
      ]);
    }

    // 3. Normalize the phone number for database lookup
    //    TeleCMI sends numbers like "919100000000" (no + prefix)
    let searchPhone = from;
    if (!searchPhone.startsWith('+')) {
      searchPhone = `+${searchPhone}`;
    }

    // Also try with +91 prefix if the number looks like an Indian number without country code
    const phoneVariants = [searchPhone];
    if (from.length === 10) {
      phoneVariants.push(`+91${from}`);
    }
    if (from.startsWith('91') && from.length === 12) {
      phoneVariants.push(`+${from}`);
    }

    // 4. Query database for the patient
    let patient = null;
    for (const phone of phoneVariants) {
      const { data, error } = await supabaseAdmin
        .from('patients')
        .select('*, clinic:clinics(*)')
        .eq('phone', phone)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        patient = data;
        break;
      }
    }

    // 5. If no patient found, inform the caller
    if (!patient) {
      return createPCMOResponse([
        {
          action: "speak",
          text: "Welcome to QueueCare. We could not find an active appointment linked to your phone number. Please check with the reception desk. Thank you for calling."
        },
        { action: "hangup" }
      ]);
    }

    // 6. Calculate queue position
    const clinicName = patient.clinic?.clinic_name || 'the clinic';
    const patientName = patient.patient_name || patient.name || 'Patient';
    const tokenNumber = patient.token_number || 'Unknown';

    // Find who is currently being served by the same doctor
    let currentToken = 'Unknown';
    let patientsAhead = 0;
    try {
      const { data: currentPatient } = await supabaseAdmin
        .from('patients')
        .select('token_number')
        .eq('clinic_id', patient.clinic_id)
        .eq('doctor_id', patient.doctor_id)
        .eq('status', 'called')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (currentPatient) {
        currentToken = currentPatient.token_number;
        patientsAhead = Math.max(0, tokenNumber - currentPatient.token_number - 1);
      }

      // Also count waiting patients ahead
      const { count } = await supabaseAdmin
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', patient.clinic_id)
        .eq('doctor_id', patient.doctor_id)
        .eq('status', 'waiting')
        .lt('token_number', tokenNumber);

      if (count !== null && count !== undefined) {
        patientsAhead = count;
      }
    } catch (e) {
      console.error('Error fetching current token:', e);
    }

    // 7. Calculate estimated wait time
    const avgTime = patient.clinic?.avg_time_per_patient_mins || 5;
    const estimatedWaitMins = patientsAhead * avgTime;

    // 8. Build the response message
    let message = `Hello ${patientName}. Welcome to ${clinicName}. `;
    message += `Your token number is ${tokenNumber}. `;

    if (currentToken !== 'Unknown') {
      message += `The doctor is currently seeing token number ${currentToken}. `;
    }

    if (patientsAhead === 0) {
      message += `You are next in line! Please be ready. `;
    } else if (patientsAhead === 1) {
      message += `There is 1 patient ahead of you. Your estimated wait time is about ${avgTime} minutes. `;
    } else {
      message += `There are ${patientsAhead} patients ahead of you. Your estimated wait time is about ${estimatedWaitMins} minutes. `;
    }

    message += `Thank you for calling. Have a great day!`;

    console.log(`Responding to ${from}: ${message}`);

    // 9. Return PCMO JSON response
    return createPCMOResponse([
      { action: "speak", text: message },
      { action: "hangup" }
    ]);

  } catch (err) {
    console.error('Webhook execution failed:', err);
    return createPCMOResponse([
      { action: "speak", text: "We are experiencing a temporary issue. Please try calling again or contact reception directly." },
      { action: "hangup" }
    ]);
  }
}
