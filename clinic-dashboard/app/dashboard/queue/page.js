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
  // No daily setup at all = offline
  if (!settings) return true;
  // Receptionist manually marked doctor as not available
  if (!settings.is_active) return true;
  // If no start/end time set, treat as offline
  if (!settings.start_time || !settings.end_time) return true;
  // Check if current time is within the doctor's working window
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

      // KEY FIX: Only fetch doctors who have set up their daily schedule today
      // (i.e., have a doctor_daily_settings row for today).
      // This prevents showing empty panels for doctors who haven't configured today.
      const { data: allDailySettings } = await supabase
        .from('doctor_daily_settings')
        .select('*, doctor:doctor_id(id, name)')
        .eq('clinic_id', staffData.clinic_id)
        .eq('date', today);

      if (!allDailySettings || allDailySettings.length === 0) {
        setDoctorPanels([]);
        setLoading(false);
        return;
      }

      const panels = allDailySettings.map(settings => {
        const doc = settings.doctor;
        const offline = isDoctorOffline(settings);
        const startTime = settings.start_time ? formatTime(settings.start_time) : null;
        const endTime = settings.end_time ? formatTime(settings.end_time) : null;
        const timeRange = (startTime && endTime) ? `${startTime} – ${endTime}` : 'No time set';
        return {
          id: doc.id,
          name: doc.name,
          settings,
          isOffline: offline,
          startTime,
          timeRange
        };
      });

      // Sort: online doctors first, then offline (marked unavailable)
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
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', marginBottom: '1rem' }}>Live Queue</h1>
        <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏥</div>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>No doctors have set up their schedule today.</div>
          <div style={{ fontSize: '14px', marginTop: '0.5rem' }}>Go to the <strong>Setup</strong> page to configure doctors for today's session.</div>
        </div>
      </div>
    );
  }

  // Grid: 1 panel = full width, 2 = 2 cols, 3+ = 3 cols (max)
  const onlineCount = doctorPanels.filter(d => !d.isOffline).length;
  const cols = doctorPanels.length === 1 ? 1 : doctorPanels.length === 2 ? 2 : 3;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>Live Queue</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
              {onlineCount} active
            </span>
            <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span>
              {doctorPanels.length - onlineCount} offline
            </span>
          </p>
        </div>
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
