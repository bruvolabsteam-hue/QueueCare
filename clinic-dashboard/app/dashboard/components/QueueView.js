/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * DoctorQueuePanel - A self-contained queue panel for a single doctor.
 * Handles its own real-time data fetching, patient management, and offline state.
 */
function DoctorQueuePanel({ doctor, clinicId, staffId, isOffline, doctorStartTime }) {
  const [patients, setPatients] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '' });
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!clinicId) return;
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today).toISOString();

    async function loadData() {
      const query = supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctor.id)
        .gte('created_at', startOfDay)
        .order('queue_position', { ascending: true });

      const { data: patientsData } = await query;
      setPatients(patientsData || []);
    }

    loadData();

    // Realtime subscription
    const channelName = `queue_${doctor.id}_${clinicId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinicId}` }, (payload) => {
        const p = payload.new;
        // Only update if this patient belongs to this specific doctor's panel
        if (p.doctor_id !== doctor.id) return;

        if (payload.eventType === 'INSERT') {
          setPatients(prev => [...prev, p].sort((a, b) => a.queue_position - b.queue_position));
        } else if (payload.eventType === 'UPDATE') {
          setPatients(prev => prev.map(x => x.id === p.id ? p : x).sort((a, b) => a.queue_position - b.queue_position));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [clinicId, doctor.id]);

  const updateStatus = async (id, status, is_no_show = false) => {
    await supabase.from('patients').update({ status, is_no_show }).eq('id', id);
    if (status === 'called') {
      const superAdminUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:3000';
      fetch(`${superAdminUrl}/api/outbound/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: id, event_type: 'queue_alert' })
      }).catch(() => {});
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!clinicId || !newPatient.name || !newPatient.phone) return;
    setIsAdding(true);

    const { data: generatedPatient, error } = await supabase.rpc('generate_daily_token', {
      p_clinic_id: clinicId,
      p_name: newPatient.name,
      p_phone: newPatient.phone,
      p_registration_method: 'walk-in',
      p_doctor_id: doctor.id !== 'generic' ? doctor.id : null
    });

    setIsAdding(false);
    if (error) {
      alert('Failed to add patient: ' + error.message);
    } else {
      setShowAddModal(false);
      setNewPatient({ name: '', phone: '' });
      if (isOffline && doctorStartTime) {
        alert(`✅ Token generated! The doctor is currently offline. Please ask the patient to return at ${doctorStartTime}.`);
      }
      if (generatedPatient) {
        const superAdminUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:3000';
        fetch(`${superAdminUrl}/api/outbound/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: generatedPatient, event_type: 'welcome' })
        }).catch(() => {});
      }
    }
  };

  const currentPatient = patients.find(p => p.status === 'called');
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const activeList = patients.filter(p => p.status === 'waiting' || p.status === 'skipped');

  return (
    <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '1.5rem', border: isOffline ? '2px solid #f59e0b' : '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>
            {doctor.name}
          </h3>
          {doctor.time_range && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              🕐 {doctor.time_range}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ padding: '7px 14px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <span>+</span> Add Patient
        </button>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏸️</span>
          <span><strong>Queue Paused</strong> — Doctor is currently offline.{doctorStartTime ? ` Available from ${doctorStartTime}.` : ''} You can still add patients to the list.</span>
        </div>
      )}

      {/* Currently Serving */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Currently Serving</div>
        {currentPatient ? (
          <>
            <div style={{ fontSize: '56px', fontWeight: '900', color: '#2563eb', lineHeight: 1 }}>{currentPatient.token_number}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '0.5rem', color: '#111827' }}>{currentPatient.name}</div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { if (!isOffline) updateStatus(currentPatient.id, 'done'); }}
                disabled={isOffline}
                style={{ flex: 1, padding: '10px', background: isOffline ? '#d1d5db' : '#10b981', color: isOffline ? '#9ca3af' : 'white', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: isOffline ? 'not-allowed' : 'pointer', fontSize: '13px' }}
              >
                {isOffline ? '🔒 Locked' : '✓ Done'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '1.5rem 0', color: '#9ca3af', fontSize: '14px' }}>No patient currently called.</div>
        )}

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={() => {
              if (waitingPatients.length > 0) {
                if (currentPatient) updateStatus(currentPatient.id, 'done');
                updateStatus(waitingPatients[0].id, 'called');
              }
            }}
            disabled={waitingPatients.length === 0 || isOffline}
            style={{
              width: '100%',
              padding: '12px',
              background: (waitingPatients.length > 0 && !isOffline) ? '#2563eb' : '#d1d5db',
              color: (waitingPatients.length > 0 && !isOffline) ? 'white' : '#9ca3af',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              cursor: (waitingPatients.length > 0 && !isOffline) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {isOffline ? '🔒 Queue Paused' : 'Call Next Waiting'}
          </button>
        </div>
      </div>

      {/* Waiting List */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiting List</div>
          <span style={{ background: '#f3f4f6', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', color: '#374151' }}>{waitingPatients.length} waiting</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
          {activeList.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: p.status === 'skipped' ? '2px dashed #f59e0b' : '1px solid #f3f4f6', borderRadius: '8px', background: p.status === 'skipped' ? '#fffbeb' : '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: p.status === 'skipped' ? '#d97706' : '#2563eb', minWidth: '32px' }}>{p.token_number}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.name}
                    {p.status === 'skipped' && <span style={{ background: '#ef4444', color: 'white', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: '700' }}>SKIPPED</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{p.phone}</div>
                </div>
              </div>
              {!isOffline && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {p.status === 'waiting' ? (
                    <>
                      <button onClick={() => updateStatus(p.id, 'called')} style={{ padding: '5px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Call</button>
                      <button onClick={() => updateStatus(p.id, 'skipped')} style={{ padding: '5px 10px', background: '#fef3c7', color: '#d97706', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Skip</button>
                      <button onClick={() => updateStatus(p.id, 'no_show', true)} style={{ padding: '5px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>No-Show</button>
                    </>
                  ) : (
                    <>
                      <button onClick={async () => {
                        await supabase.rpc('re_insert_token', { p_patient_id: p.id, p_mode: 'insert_now', p_staff_id: staffId });
                      }} style={{ padding: '5px 10px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>↑ Now</button>
                      <button onClick={async () => {
                        await supabase.rpc('re_insert_token', { p_patient_id: p.id, p_mode: 'add_to_end', p_staff_id: staffId });
                      }} style={{ padding: '5px 10px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>↓ End</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {activeList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '14px' }}>Queue is empty.</div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '18px' }}>Add Patient for {doctor.name}</h2>
            {isOffline && doctorStartTime && (
              <p style={{ color: '#d97706', background: '#fef3c7', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
                ⚠️ Doctor is offline. Patient will be queued and should arrive at <strong>{doctorStartTime}</strong>.
              </p>
            )}
            <form onSubmit={handleAddPatient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Patient Name</label>
                <input type="text" required value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Phone Number</label>
                <input type="tel" required value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isAdding} style={{ flex: 1, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                  {isAdding ? 'Adding...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QueueView({ doctorId = 'all', doctors = [], clinicId, staffId }) {
  // This is now a compatibility shim. The new multi-doctor page renders DoctorQueuePanel directly.
  // This component is kept for backward compatibility with the setup page.
  const [patients, setPatients] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', doctor_id: doctorId === 'all' ? '' : doctorId });
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!clinicId) return;
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today).toISOString();
    async function loadData() {
      const { data: patientsData } = await supabase
        .from('patients').select('*').eq('clinic_id', clinicId)
        .gte('created_at', startOfDay).order('queue_position', { ascending: true });
      setPatients(patientsData || []);
      const channelName = `realtime_patients_${doctorId}_${Math.random().toString(36).substring(7)}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinicId}` }, payload => {
          if (payload.eventType === 'INSERT') setPatients(prev => [...prev, payload.new].sort((a, b) => a.queue_position - b.queue_position));
          else if (payload.eventType === 'UPDATE') setPatients(prev => prev.map(p => p.id === payload.new.id ? payload.new : p).sort((a, b) => a.queue_position - b.queue_position));
        }).subscribe();
      return () => supabase.removeChannel(channel);
    }
    loadData();
  }, [clinicId, doctorId]);

  const updateStatus = async (id, status, is_no_show = false) => {
    await supabase.from('patients').update({ status, is_no_show }).eq('id', id);
    if (status === 'called') {
      const superAdminUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:3000';
      fetch(`${superAdminUrl}/api/outbound/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: id, event_type: 'queue_alert' }) }).catch(() => {});
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!clinicId || !newPatient.name || !newPatient.phone) return;
    setIsAdding(true);
    const { data: generatedPatient, error } = await supabase.rpc('generate_daily_token', {
      p_clinic_id: clinicId, p_name: newPatient.name, p_phone: newPatient.phone,
      p_registration_method: 'walk-in', p_doctor_id: newPatient.doctor_id || null
    });
    setIsAdding(false);
    if (error) { alert('Failed to add patient: ' + error.message); }
    else {
      setShowAddModal(false);
      setNewPatient({ name: '', phone: '', doctor_id: doctorId === 'all' ? '' : doctorId });
      if (generatedPatient) {
        const superAdminUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:3000';
        fetch(`${superAdminUrl}/api/outbound/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: generatedPatient, event_type: 'welcome' }) }).catch(() => {});
      }
    }
  };

  const handleOverride = async (patient, mode) => {
    if (patient.re_entry_count >= 2) {
      const confirm = window.confirm(`This patient has been re-added ${patient.re_entry_count} times. Continue?`);
      if (!confirm) return;
    }
    const { error } = await supabase.rpc('re_insert_token', { p_patient_id: patient.id, p_mode: mode, p_staff_id: staffId });
    if (error) alert('Failed to re-insert patient: ' + error.message);
    else alert(`Token #${patient.token_number} re-inserted!`);
  };

  const filteredPatients = doctorId === 'all' ? patients : patients.filter(p => p.doctor_id === doctorId);
  const currentPatient = filteredPatients.find(p => p.status === 'called');
  const waitingPatients = filteredPatients.filter(p => p.status === 'waiting');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Live Queue {doctorId !== 'all' ? `for ${doctors.find(d => d.id === doctorId)?.name}` : '(Generic)'}</h2>
        <button onClick={() => { setNewPatient(prev => ({ ...prev, doctor_id: doctorId !== 'all' ? doctorId : '' })); setShowAddModal(true); }} style={{ padding: '10px 20px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Patient</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <section style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', color: '#6b7280', marginBottom: '1rem' }}>Currently Serving</h2>
          {currentPatient ? (
            <div>
              <div style={{ fontSize: '72px', fontWeight: '900', color: '#2563eb', lineHeight: '1' }}>{currentPatient.token_number}</div>
              <div style={{ fontSize: '24px', fontWeight: '600', marginTop: '1rem' }}>{currentPatient.name}</div>
              <div style={{ marginTop: '2rem' }}><button onClick={() => updateStatus(currentPatient.id, 'done')} style={{ padding: '12px 24px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Mark Done</button></div>
            </div>
          ) : <div style={{ padding: '3rem 0', color: '#9ca3af' }}>No patient currently called.</div>}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
            <button onClick={() => { if (waitingPatients.length > 0) { if (currentPatient) updateStatus(currentPatient.id, 'done'); updateStatus(waitingPatients[0].id, 'called'); } }} disabled={waitingPatients.length === 0} style={{ width: '100%', padding: '16px', background: waitingPatients.length > 0 ? '#2563eb' : '#9ca3af', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: waitingPatients.length > 0 ? 'pointer' : 'not-allowed' }}>Call Next Waiting</button>
          </div>
        </section>
        <section style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Waiting List</h2>
            <span style={{ background: '#f3f4f6', padding: '4px 12px', borderRadius: '99px', fontSize: '14px', fontWeight: 'bold' }}>{waitingPatients.length} Waiting</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPatients.filter(p => p.status === 'waiting' || p.status === 'skipped').map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: p.status === 'skipped' ? '2px dashed #f59e0b' : '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{p.token_number}</div>
                  <div><div style={{ fontWeight: '600' }}>{p.name}</div><div style={{ fontSize: '14px', color: '#6b7280' }}>{p.phone}</div></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {p.status === 'waiting' ? (
                    <>
                      <button onClick={() => updateStatus(p.id, 'called')} style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Call Now</button>
                      <button onClick={() => updateStatus(p.id, 'skipped')} style={{ padding: '8px 16px', background: '#fef3c7', color: '#d97706', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Skip</button>
                      <button onClick={() => updateStatus(p.id, 'no_show', true)} style={{ padding: '8px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>No-Show</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleOverride(p, 'insert_now')} style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>↑ Insert Now</button>
                      <button onClick={() => handleOverride(p, 'add_to_end')} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>↓ Add to End</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredPatients.filter(p => p.status === 'waiting' || p.status === 'skipped').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>The queue is empty.</div>
            )}
          </div>
        </section>
      </div>
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Manual Token Entry</h2>
            <form onSubmit={handleAddPatient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {doctorId === 'all' && doctors.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Assign to Doctor</label>
                  <select value={newPatient.doctor_id} onChange={e => setNewPatient({ ...newPatient, doctor_id: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}>
                    <option value="">None (Generic Queue)</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Patient Name</label><input type="text" required value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Phone Number</label><input type="tel" required value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isAdding} style={{ flex: 1, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{isAdding ? 'Adding...' : 'Generate Token'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { DoctorQueuePanel };
