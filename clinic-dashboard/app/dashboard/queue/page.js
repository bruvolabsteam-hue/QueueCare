/* eslint-disable */
'use client';
import { useState, useEffect, useCallback } from 'react';
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
  if (!settings) return true;
  if (!settings.is_active) return true; // manually marked Not Available
  if (!settings.start_time || !settings.end_time) return true;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const startMs = new Date(`${today}T${settings.start_time}`).getTime();
  const endMs = new Date(`${today}T${settings.end_time}`).getTime();
  const nowMs = now.getTime();
  return nowMs < startMs || nowMs > endMs;
}

// Global Add Patient Modal at the top-level page
function GlobalAddPatientModal({ doctors, clinicId, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !selectedDoctorId) return;
    setIsAdding(true);

    const { data: generatedPatient, error } = await supabase.rpc('generate_daily_token', {
      p_clinic_id: clinicId,
      p_name: name,
      p_phone: phone,
      p_registration_method: 'walk-in',
      p_doctor_id: selectedDoctorId,
    });

    setIsAdding(false);
    if (error) {
      alert('Failed to add patient: ' + error.message);
    } else {
      // Trigger welcome notification
      if (generatedPatient) {
        const superAdminUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:3000';
        fetch(`${superAdminUrl}/api/outbound/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: generatedPatient, event_type: 'welcome' })
        }).catch(() => {});
      }
      onSuccess(selectedDoctorId, selectedDoctor?.isOffline, selectedDoctor?.startTime);
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Add New Patient</h2>
        <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '13px' }}>Select a doctor and enter the patient details.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Doctor Selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Assign to Doctor</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px' }}>
              {doctors.map(doc => (
                <label key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  borderRadius: '8px', cursor: 'pointer',
                  background: selectedDoctorId === doc.id ? '#eff6ff' : 'transparent',
                  border: selectedDoctorId === doc.id ? '2px solid #2563eb' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}>
                  <input
                    type="radio"
                    name="doctor"
                    value={doc.id}
                    checked={selectedDoctorId === doc.id}
                    onChange={() => setSelectedDoctorId(doc.id)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{doc.name}</div>
                    {doc.timeRange && <div style={{ fontSize: '11px', color: '#6b7280' }}>🕐 {doc.timeRange}</div>}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px',
                    background: doc.isOffline ? '#fef3c7' : '#d1fae5',
                    color: doc.isOffline ? '#92400e' : '#065f46'
                  }}>
                    {doc.isOffline ? 'Offline' : 'Active'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Offline warning */}
          {selectedDoctor?.isOffline && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92400e' }}>
              ⚠️ <strong>Doctor is currently offline.</strong>{selectedDoctor.startTime ? ` Please ask patient to return at ${selectedDoctor.startTime}.` : ' Token will be generated for when they are available.'}
            </div>
          )}

          {/* Patient Name */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Patient Name</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. John Kumar"
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Phone Number</label>
            <input
              type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
            <button type="submit" disabled={isAdding || !selectedDoctorId} style={{ flex: 2, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', opacity: isAdding ? 0.7 : 1 }}>
              {isAdding ? 'Generating Token...' : '✓ Generate Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LiveQueuePage() {
  const [clinicId, setClinicId] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [doctorPanels, setDoctorPanels] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]); // for the modal dropdown
  const [loading, setLoading] = useState(true);
  const [showGlobalAdd, setShowGlobalAdd] = useState(false);
  const supabase = createClient();

  const loadData = useCallback(async () => {
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

    // Fetch ALL active doctors for the modal dropdown
    const { data: allDoctorsData } = await supabase
      .from('staff')
      .select('id, name')
      .eq('clinic_id', staffData.clinic_id)
      .eq('role', 'doctor')
      .eq('is_active', true);

    // Fetch today's daily settings
    const { data: allDailySettings } = await supabase
      .from('doctor_daily_settings')
      .select('*, doctor:doctor_id(id, name)')
      .eq('clinic_id', staffData.clinic_id)
      .eq('date', today);

    // Build set of doctor IDs that have daily settings today
    const scheduledDoctorIds = new Set((allDailySettings || []).map(s => s.doctor_id));

    // Build panels — only doctors WITH a today schedule
    const panels = (allDailySettings || []).map(settings => {
      const doc = settings.doctor;
      const offline = isDoctorOffline(settings);
      const startTime = settings.start_time ? formatTime(settings.start_time) : null;
      const endTime = settings.end_time ? formatTime(settings.end_time) : null;
      const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : null;
      return {
        id: doc.id,
        name: doc.name,
        settings,
        isOffline: offline,
        startTime,
        timeRange,
      };
    });

    // Sort: online first, offline last
    panels.sort((a, b) => (a.isOffline ? 1 : 0) - (b.isOffline ? 1 : 0));
    setDoctorPanels(panels);

    // Enrich allDoctors with offline status for the modal
    const enriched = (allDoctorsData || []).map(doc => {
      const settings = (allDailySettings || []).find(s => s.doctor_id === doc.id) || null;
      const offline = isDoctorOffline(settings);
      const startTime = settings?.start_time ? formatTime(settings.start_time) : null;
      const endTime = settings?.end_time ? formatTime(settings.end_time) : null;
      const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : null;
      return { ...doc, isOffline: offline, startTime, timeRange };
    });
    // Sort: active first
    enriched.sort((a, b) => (a.isOffline ? 1 : 0) - (b.isOffline ? 1 : 0));
    setAllDoctors(enriched);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  // When a patient is added to a doctor who doesn't yet have a panel, add their panel dynamically
  const handlePatientAdded = (doctorId, isOffline, startTime) => {
    if (isOffline && startTime) {
      alert(`✅ Token generated!\n\n⚠️ Doctor is currently offline. Please ask the patient to return at ${startTime}.`);
    } else {
      // No alert needed — the panel will update via realtime
    }

    // If this doctor doesn't have a panel yet, reload all panels so their panel appears
    const exists = doctorPanels.find(p => p.id === doctorId);
    if (!exists) {
      loadData(); // Refresh panel list to include the new doctor's panel
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading Live Queue...</div>;
  if (!clinicId) return <div style={{ padding: '2rem' }}>Could not load clinic data.</div>;

  const onlineCount = doctorPanels.filter(d => !d.isOffline).length;
  const cols = doctorPanels.length === 0 ? 1 : doctorPanels.length === 1 ? 1 : doctorPanels.length === 2 ? 2 : 3;

  return (
    <div style={{ padding: '2rem' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>Live Queue</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              {onlineCount} active
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }} />
              {doctorPanels.length - onlineCount} offline
            </span>
          </p>
        </div>

        {/* Global Add Patient Button */}
        {allDoctors.length > 0 && (
          <button
            onClick={() => setShowGlobalAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 20px', background: '#2563eb', color: 'white',
              borderRadius: '10px', border: 'none', fontWeight: '700',
              fontSize: '14px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
              transition: 'transform 0.1s, box-shadow 0.1s'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.45)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)'; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Patient
          </button>
        )}
      </div>

      {/* ── Empty State ── */}
      {doctorPanels.length === 0 && (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>🏥</div>
          <div style={{ fontWeight: '700', fontSize: '17px', color: '#111827', marginBottom: '6px' }}>No doctors have set up their schedule today.</div>
          <div style={{ fontSize: '14px' }}>Go to the <strong>Setup</strong> page to configure doctors for today's session.</div>
          <div style={{ marginTop: '1.5rem', fontSize: '13px', color: '#9ca3af' }}>You can still add a patient using the "+ Add Patient" button above — it will create a panel automatically.</div>
        </div>
      )}

      {/* ── Doctor Panels Grid ── */}
      {doctorPanels.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '1.5rem',
          alignItems: 'start',
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
      )}

      {/* ── Global Add Patient Modal ── */}
      {showGlobalAdd && (
        <GlobalAddPatientModal
          doctors={allDoctors}
          clinicId={clinicId}
          onClose={() => setShowGlobalAdd(false)}
          onSuccess={handlePatientAdded}
        />
      )}
    </div>
  );
}
