'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '../table.module.css'; // Reusing table styles for layout
import QueueView from '../components/QueueView';

export default function DailySetupPage() {
  const supabase = createClient();
  const [clinicId, setClinicId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    max_patients: '',
    time_per_patient_mins: 10,
    start_time: '09:00',
    end_time: '17:00',
    mode: 'walk-in'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Queue View State
  const [viewingQueueFor, setViewingQueueFor] = useState(null);
  const [staffId, setStaffId] = useState(null);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  async function fetchSetupStatus() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get clinic
    const { data: staffData } = await supabase.from('staff').select('clinic_id, id').eq('email', user.email).single();
    if (!staffData) return;
    setClinicId(staffData.clinic_id);
    setStaffId(staffData.id);

    // Get all active doctors
    const { data: activeDocs } = await supabase.from('staff')
      .select('*')
      .eq('clinic_id', staffData.clinic_id)
      .eq('role', 'doctor')
      .eq('is_active', true)
      .order('name');
      
    if (!activeDocs) return;

    const today = new Date().toISOString().split('T')[0];
    
    let docsWithStatus = [];
    
    for (let doc of activeDocs) {
      // Get today's settings
      const { data: settings } = await supabase.from('doctor_daily_settings')
        .select('*')
        .eq('doctor_id', doc.id)
        .eq('date', today)
        .single();
        
      // Get yesterday's to prepopulate if needed
      let pastSettings = null;
      if (!settings || !settings.setup_confirmed) {
         const { data: pSettings } = await supabase.from('doctor_daily_settings')
          .select('*')
          .eq('doctor_id', doc.id)
          .order('date', { ascending: false })
          .limit(1)
          .single();
         pastSettings = pSettings;
      }

      docsWithStatus.push({
        ...doc,
        today_settings: settings,
        setup_confirmed: settings?.setup_confirmed || false,
        past_settings: pastSettings
      });
    }

    setDoctors(docsWithStatus);
    setLoading(false);
  }

  function openSetup(doc) {
    const defaults = doc.today_settings || doc.past_settings || {};
    setFormData({
      max_patients: defaults.max_patients || '',
      time_per_patient_mins: defaults.time_per_patient_mins || 10,
      start_time: defaults.start_time || '09:00',
      end_time: defaults.end_time || '17:00',
      mode: defaults.mode || 'walk-in'
    });
    setSelectedDoctor(doc);
  }

  async function saveSettings(isActive) {
    if (!selectedDoctor) return;
    setIsSaving(true);
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await supabase.from('doctor_daily_settings').upsert({
        doctor_id: selectedDoctor.id,
        clinic_id: clinicId,
        date: today,
        max_patients: isActive ? (formData.max_patients ? parseInt(formData.max_patients) : null) : 0,
        time_per_patient_mins: isActive ? formData.time_per_patient_mins : 0,
        start_time: isActive ? formData.start_time : null,
        end_time: isActive ? formData.end_time : null,
        mode: isActive ? formData.mode : 'walk-in',
        is_active: isActive,
        setup_confirmed: true
      }, { onConflict: 'doctor_id, date' });
      
      setSelectedDoctor(null);
      fetchSetupStatus();
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Daily Doctor Setup</h2>
      </div>
      
      <p style={{color: '#4b5563', marginBottom: '1.5rem'}}>
        Configure the queue settings for your doctors for today. You can update these settings individually as doctors arrive.
      </p>

      <div className={styles.tableCard}>
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center'}}>Loading doctors...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Status Today</th>
                <th>Queue Hours</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(doc => (
                <tr key={doc.id} style={{background: viewingQueueFor?.id === doc.id ? '#eff6ff' : 'transparent'}}>
                  <td style={{fontWeight: 500}}>{doc.name}</td>
                  <td>
                    {doc.setup_confirmed ? (
                       doc.today_settings?.is_active ? (
                         <span style={{color: '#059669', background: '#d1fae5', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'}}>Active</span>
                       ) : (
                         <span style={{color: '#b91c1c', background: '#fee2e2', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'}}>Not Available</span>
                       )
                    ) : (
                      <span style={{color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'}}>Needs Setup</span>
                    )}
                  </td>
                  <td>
                    {doc.setup_confirmed && doc.today_settings?.is_active ? (
                      <span style={{color: '#4b5563', fontSize: '14px'}}>
                        {doc.today_settings.start_time?.substring(0, 5)} - {doc.today_settings.end_time?.substring(0, 5)}
                      </span>
                    ) : (
                      <span style={{color: '#9ca3af', fontSize: '14px'}}>-</span>
                    )}
                  </td>
                  <td>
                    {doc.setup_confirmed && doc.today_settings?.is_active ? (
                       <span style={{textTransform: 'capitalize', fontSize: '14px', color: '#4b5563'}}>{doc.today_settings.mode}</span>
                    ) : (
                      <span style={{color: '#9ca3af', fontSize: '14px'}}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button 
                        onClick={() => openSetup(doc)}
                        style={{padding: '6px 12px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 500}}
                      >
                        {doc.setup_confirmed ? 'Edit Setup' : 'Set Up Queue'}
                      </button>
                      {doc.setup_confirmed && doc.today_settings?.is_active && (
                        <button 
                          onClick={() => setViewingQueueFor(viewingQueueFor?.id === doc.id ? null : doc)}
                          style={{padding: '6px 12px', fontSize: '12px', border: 'none', borderRadius: '6px', background: viewingQueueFor?.id === doc.id ? '#1e3a8a' : '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold'}}
                        >
                          {viewingQueueFor?.id === doc.id ? 'Close Queue' : 'View Queue'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>No active doctors found. Add them in Staff Management.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Render the selected doctor's queue */}
      {viewingQueueFor && (
         <div style={{marginTop: '2rem', borderTop: '2px solid #e5e7eb', paddingTop: '2rem'}}>
           <QueueView 
             doctorId={viewingQueueFor.id} 
             doctors={doctors} 
             clinicId={clinicId} 
             staffId={staffId} 
           />
         </div>
      )}

      {selectedDoctor && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div style={{backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
            <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
              <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937'}}>Daily Setup</h2>
              <p style={{color: '#4b5563', marginTop: '0.5rem'}}>Set up today's queue for <strong style={{color: '#2563eb'}}>Dr. {selectedDoctor.name}</strong></p>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px'}}>Max patients today (leave blank for unlimited)</label>
                <input type="number" value={formData.max_patients} onChange={e => setFormData({...formData, max_patients: e.target.value})} placeholder="e.g. 20" style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px'}}>Time per patient (minutes)</label>
                <input type="number" value={formData.time_per_patient_mins} onChange={e => setFormData({...formData, time_per_patient_mins: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>

              <div style={{display: 'flex', gap: '1rem'}}>
                <div style={{flex: 1}}>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px'}}>Available from</label>
                  <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
                </div>
                <div style={{flex: 1}}>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px'}}>Available until</label>
                  <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
                </div>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px'}}>Queue mode today</label>
                <select value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white'}}>
                  <option value="walk-in">Walk-in tokens only</option>
                  <option value="appointment">Appointments only</option>
                  <option value="both">Both walk-in and appointments</option>
                </select>
              </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem'}}>
              <button 
                onClick={() => saveSettings(true)}
                disabled={isSaving}
                style={{padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px'}}
              >
                {isSaving ? 'Saving...' : `Start Queue for Dr. ${selectedDoctor.name}`}
              </button>
              
              <button 
                onClick={() => saveSettings(false)}
                disabled={isSaving}
                style={{padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '14px'}}
              >
                Doctor Not Available Today
              </button>
              
              <button 
                onClick={() => setSelectedDoctor(null)}
                style={{padding: '8px', background: 'transparent', color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
