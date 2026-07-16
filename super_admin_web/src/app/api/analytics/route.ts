import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // 1. Total Clinics
    const { count: totalClinics, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('*', { count: 'exact', head: true });

    if (clinicError) throw clinicError;

    // 2. Total Patients (All-time)
    const { count: totalPatients, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (patientError) throw patientError;

    // 3. Today's Patients
    const today = new Date().toISOString().split('T')[0];
    const { count: todayPatients, error: todayError } = await supabaseAdmin
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    if (todayError) throw todayError;

    // 4. Registration Methods Breakdown
    // Supabase JS doesn't support GROUP BY easily without RPC, so we will fetch just the registration_method column for all patients (or a sample if too large, but for now it's fine).
    const { data: methodsData, error: methodsError } = await supabaseAdmin
      .from('patients')
      .select('registration_method');

    if (methodsError) throw methodsError;

    const methodsCount = {
      'walk-in': 0,
      'kiosk': 0,
      'ivr': 0,
      'whatsapp': 0
    };

    methodsData.forEach(p => {
      if (p.registration_method && methodsCount[p.registration_method as keyof typeof methodsCount] !== undefined) {
        methodsCount[p.registration_method as keyof typeof methodsCount]++;
      }
    });

    // 5. Clinic Leaderboard (Top 5 clinics by patient count)
    // We fetch all clinics, and for each clinic we count patients. To avoid N+1, we can fetch all patients' clinic_id and count in memory.
    const { data: clinicsData, error: clinicsListError } = await supabaseAdmin
      .from('clinics')
      .select('id, clinic_name');

    if (clinicsListError) throw clinicsListError;

    const { data: patientClinicData, error: patientClinicError } = await supabaseAdmin
      .from('patients')
      .select('clinic_id');

    if (patientClinicError) throw patientClinicError;

    const clinicCounts: Record<string, number> = {};
    patientClinicData.forEach(p => {
      clinicCounts[p.clinic_id] = (clinicCounts[p.clinic_id] || 0) + 1;
    });

    const leaderboard = clinicsData.map(c => ({
      id: c.id,
      name: c.clinic_name,
      patient_count: clinicCounts[c.id] || 0
    })).sort((a, b) => b.patient_count - a.patient_count).slice(0, 5);

    return NextResponse.json({
      totalClinics,
      totalPatients,
      todayPatients,
      methodsCount,
      leaderboard
    });

  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics', details: error.message }, { status: 500 });
  }
}
