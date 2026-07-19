/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { DoctorQueuePanel } from '../components/QueueView';

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function isDoctorOffline(settings) {
  if (!settings || !settings.is_active) return true;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const startMs = new Date(`${today}T${settings.start_time}`).getTime();
  const endMs = new Date(`${today}T${settings.end_time}`).getTime();
  const nowMs = now.getTime();
  return nowMs < startMs || nowMs > endMs;
}

export default function LiveQueuePage() {
  const [clinicId, setClinicId] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [doctorPanels, setDoctorPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id, id')
        .eq('email', user.email)
        .single();
      if (!staffData) { setLoading(false); return; }

      setClinicId(staffData.clinic_id);
      setStaffId(staffData.id);

      const today = new Date().toISOString().split('T')[0];

      // Fetch all active doctors
      const { data: doctorsData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('clinic_id', staffData.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (!doctorsData || doctorsData.length === 0) {
        setDoctorPanels([]);
        setLoading(false);
        return;
      }

      // Fetch today's settings for each doctor
      const { data: allDailySettings } = await supabase
        .from('doctor_daily_settings')
        .select('*')
        .eq('clinic_id', staffData.clinic_id)
        .eq('date', today);

      const panels = doctorsData.map(doc => {
        const settings = (allDailySettings || []).find(s => s.doctor_id === doc.id) || null;
        const offline = isDoctorOffline(settings);
        const startTime = settings ? formatTime(settings.start_time) : null;
        const endTime = settings ? formatTime(settings.end_time) : null;
        const timeRange = (startTime && endTime) ? `${startTime} – ${endTime}` : 'No schedule set today';
        return {
          ...doc,
          settings,
          isOffline: offline,
          startTime,
          timeRange
        };
      });

      // Sort: online doctors first
      panels.sort((a, b) => (a.isOffline ? 1 : 0) - (b.isOffline ? 1 : 0));
      setDoctorPanels(panels);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading Live Queue...</div>;

  if (!clinicId) return <div style={{ padding: '2rem' }}>Could not load clinic data.</div>;

  if (doctorPanels.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '1rem' }}>Live Queue</h2>
        <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏥</div>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>No active doctors found.</div>
          <div style={{ fontSize: '14px', marginTop: '0.5rem' }}>Please add doctors in Settings, then set up their daily schedule in the Setup page.</div>
        </div>
      </div>
    );
  }

  // Determine grid column count: 1 doctor = full width, 2 = 2 col, 3+ = 3 col
  const cols = doctorPanels.length === 1 ? 1 : doctorPanels.length === 2 ? 2 : 3;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>Live Queue</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
          {doctorPanels.filter(d => !d.isOffline).length} of {doctorPanels.length} doctor(s) currently active
        </p>
      </div>

      {/* Doctor Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {doctorPanels.map(doc => (
          <DoctorQueuePanel
            key={doc.id}
            doctor={doc}
            clinicId={clinicId}
            staffId={staffId}
            isOffline={doc.isOffline}
            doctorStartTime={doc.startTime}
          />
        ))}
      </div>
    </div>
  );
}
