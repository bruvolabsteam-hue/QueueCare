/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function QueueView({ doctorId = 'all', doctors = [], clinicId, staffId }) {
  const [patients, setPatients] = useState([]);
  const [queueActions, setQueueActions] = useState([]);
  
  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', doctor_id: doctorId === 'all' ? '' : doctorId });
  const [isAdding, setIsAdding] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!clinicId) return;
    
    async function loadData() {
      // Fetch today's patients
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = new Date(today).toISOString();
      
      const { data: patientsData } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfDay)
        .order('queue_position', { ascending: true });
        
      setPatients(patientsData || []);

      // Fetch audit log
      const { data: actionsData } = await supabase
        .from('queue_actions')
        .select('*, staff:done_by(name), patients:patient_id(name)')
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfDay)
        .order('created_at', { ascending: false })
        .limit(50);
        
      setQueueActions(actionsData || []);

      // Subscribe to real-time changes
      const channelName = `realtime_patients_${doctorId}_${Math.random().toString(36).substring(7)}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinicId}` }, payload => {
          if (payload.eventType === 'INSERT') {
            setPatients(prev => [...prev, payload.new].sort((a,b) => a.queue_position - b.queue_position));
          } else if (payload.eventType === 'UPDATE') {
            setPatients(prev => prev.map(p => p.id === payload.new.id ? payload.new : p).sort((a,b) => a.queue_position - b.queue_position));
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'queue_actions', filter: `clinic_id=eq.${clinicId}` }, async payload => {
           const { data } = await supabase.from('queue_actions').select('*, staff:done_by(name), patients:patient_id(name)').eq('id', payload.new.id).single();
           if (data) setQueueActions(prev => [data, ...prev].slice(0, 50));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel) };
    }
    loadData();
  }, [clinicId, doctorId]);

  const updateStatus = async (id, status, is_no_show = false) => {
    await supabase.from('patients').update({ status, is_no_show }).eq('id', id);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!clinicId || !newPatient.name || !newPatient.phone) return;
    
    setIsAdding(true);
    const { error } = await supabase.rpc('generate_daily_token', {
      p_clinic_id: clinicId,
      p_name: newPatient.name,
      p_phone: newPatient.phone,
      p_registration_method: 'receptionist',
      p_doctor_id: newPatient.doctor_id || null
    });
    
    setIsAdding(false);
    if (error) {
      alert('Failed to add patient: ' + error.message);
    } else {
      setShowAddModal(false);
      setNewPatient({ name: '', phone: '', doctor_id: doctorId === 'all' ? '' : doctorId });
    }
  };

  const handleOverride = async (patient, mode) => {
    if (patient.re_entry_count >= 2) {
      const confirm = window.confirm(`This patient has been re-added ${patient.re_entry_count} times. Are you sure you want to re-add them again?`);
      if (!confirm) return;
    }
    
    const { error } = await supabase.rpc('re_insert_token', {
      p_patient_id: patient.id,
      p_mode: mode,
      p_staff_id: staffId
    });
    
    if (error) {
      alert('Failed to re-insert patient: ' + error.message);
    } else {
      alert(`Token #${patient.token_number} re-inserted successfully!`);
    }
  };

  // Filter patients by selected doctor
  const filteredPatients = doctorId === 'all' 
    ? patients 
    : patients.filter(p => p.doctor_id === doctorId);

  const currentPatient = filteredPatients.find(p => p.status === 'called');
  const waitingPatients = filteredPatients.filter(p => p.status === 'waiting');
  const finishedPatients = filteredPatients.filter(p => ['done', 'skipped', 'no_show'].includes(p.status));

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h2 style={{fontSize: '20px', fontWeight: 'bold'}}>Live Queue {doctorId !== 'all' ? `for ${doctors.find(d => d.id === doctorId)?.name}` : '(Generic)'}</h2>
        <button 
          onClick={() => {
             setNewPatient(prev => ({...prev, doctor_id: doctorId !== 'all' ? doctorId : ''}));
             setShowAddModal(true);
          }}
          style={{padding: '10px 20px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}
        >
          <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Add Patient
        </button>
      </div>
      
      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
        {/* Current Patient Panel */}
        <section style={{background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center'}}>
          <h2 style={{fontSize: '20px', color: '#6b7280', marginBottom: '1rem'}}>Currently Serving</h2>
          {currentPatient ? (
            <div>
              <div style={{fontSize: '72px', fontWeight: '900', color: '#2563eb', lineHeight: '1'}}>{currentPatient.token_number}</div>
              <div style={{fontSize: '24px', fontWeight: '600', marginTop: '1rem'}}>{currentPatient.name}</div>
              {doctorId === 'all' && (
                <div style={{fontSize: '14px', color: '#4b5563', marginTop: '0.5rem'}}>
                  With: {doctors.find(d => d.id === currentPatient.doctor_id)?.name || 'Unknown'}
                </div>
              )}
              <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                <button onClick={() => updateStatus(currentPatient.id, 'done')} style={{padding: '12px 24px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', flex: 1}}>
                  Mark Done
                </button>
              </div>
            </div>
          ) : (
            <div style={{padding: '3rem 0', color: '#9ca3af'}}>
              No patient currently called.
            </div>
          )}
          
          <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb'}}>
            <button 
              onClick={() => {
                if (waitingPatients.length > 0) {
                  if (currentPatient) updateStatus(currentPatient.id, 'done');
                  updateStatus(waitingPatients[0].id, 'called');
                }
              }}
              disabled={waitingPatients.length === 0}
              style={{width: '100%', padding: '16px', background: waitingPatients.length > 0 ? '#2563eb' : '#9ca3af', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: waitingPatients.length > 0 ? 'pointer' : 'not-allowed'}}
            >
              Call Next Waiting
            </button>
          </div>
        </section>

        {/* Waiting List */}
        <section style={{background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h2 style={{fontSize: '20px', fontWeight: '600'}}>Waiting List</h2>
            <span style={{background: '#f3f4f6', padding: '4px 12px', borderRadius: '99px', fontSize: '14px', fontWeight: 'bold'}}>{waitingPatients.length} Waiting</span>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {filteredPatients.filter(p => p.status === 'waiting' || p.status === 'skipped').map((p, idx) => (
              <div key={p.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: p.status === 'skipped' ? '2px dashed #f59e0b' : '1px solid #e5e7eb', borderRadius: '8px', background: p.status === 'skipped' ? '#fffbeb' : 'white'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                  <div style={{fontSize: '24px', fontWeight: 'bold', color: p.status === 'skipped' ? '#d97706' : '#2563eb', width: '40px'}}>{p.token_number}</div>
                  <div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                       <span style={{fontWeight: '600', fontSize: '16px'}}>{p.name}</span>
                       {p.status === 'skipped' && <span style={{background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>SKIPPED</span>}
                       {p.re_entry_count > 0 && <span style={{background: '#3b82f6', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>Re-added {p.re_entry_count}x</span>}
                    </div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>{p.phone}</div>
                    {doctorId === 'all' && (
                      <div style={{fontSize: '12px', color: '#4b5563', marginTop: '2px'}}>
                        For: {doctors.find(d => d.id === p.doctor_id)?.name || 'Unknown'}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  {p.status === 'waiting' ? (
                    <>
                      <button onClick={() => updateStatus(p.id, 'called')} style={{padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500'}}>Call Now</button>
                      <button onClick={() => updateStatus(p.id, 'skipped')} style={{padding: '8px 16px', background: '#fef3c7', color: '#d97706', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500'}}>Skip</button>
                      <button onClick={() => updateStatus(p.id, 'no_show', true)} style={{padding: '8px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500'}}>No-Show</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleOverride(p, 'insert_now')} style={{padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>✅ Insert Now</button>
                      <button onClick={() => handleOverride(p, 'add_to_end')} style={{padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>🔁 Add to End</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredPatients.filter(p => p.status === 'waiting' || p.status === 'skipped').length === 0 && (
              <div style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>The queue is empty.</div>
            )}
          </div>
        </section>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div style={{backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px'}}>
            <h2 style={{marginTop: 0, marginBottom: '1.5rem'}}>Manual Token Entry</h2>
            <form onSubmit={handleAddPatient} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {doctorId === 'all' && doctors.length > 0 && (
                <div>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Assign to Doctor</label>
                  <select value={newPatient.doctor_id} onChange={e => setNewPatient({...newPatient, doctor_id: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white'}}>
                    <option value="">None (Generic Queue)</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Patient Name</label>
                <input type="text" required value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Phone Number</label>
                <input type="tel" required value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}>Cancel</button>
                <button type="submit" disabled={isAdding} style={{flex: 1, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}>
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
