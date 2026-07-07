/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import styles from '../table.module.css';
import { createClient } from '@/utils/supabase/client';

export default function StaffPage() {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const initialFormState = { id: null, name: '', specialization: '', phone: '', whatsapp_number: '', allow_patient_calls: false, role: 'doctor' };
  const [formData, setFormData] = useState(initialFormState);
  
  const [isSaving, setIsSaving] = useState(false);
  const [clinicId, setClinicId] = useState(null);

  useEffect(() => {
    async function initUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        fetchStaff(authUser.email);
      }
    }
    initUser();
  }, []);

  async function fetchStaff(userEmail) {
    setLoading(true);
    const { data: staffData } = await supabase.from('staff').select('clinic_id').eq('email', userEmail).single();
    if (staffData?.clinic_id) {
      setClinicId(staffData.clinic_id);
      
      const { data } = await supabase.from('staff')
        .select('*')
        .eq('clinic_id', staffData.clinic_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setStaff(data || []);
    }
    setLoading(false);
  }

  async function handleSaveStaff(e) {
    e.preventDefault();
    if (!clinicId) return;
    setIsSaving(true);
    
    try {
      if (formData.id) {
        const { error } = await supabase.from('staff').update({
          name: formData.name,
          specialization: formData.specialization,
          phone: formData.phone,
          whatsapp_number: formData.whatsapp_number,
          allow_patient_calls: formData.allow_patient_calls
        }).eq('id', formData.id);
        if (error) throw error;
      } else {
        const dummyEmail = `doctor_${Date.now()}@queuecare.internal`;
        const { error } = await supabase.from('staff').insert([{
          clinic_id: clinicId,
          name: formData.name,
          email: formData.role === 'receptionist' ? formData.email : dummyEmail,
          role: formData.role,
          specialization: formData.specialization,
          phone: formData.phone,
          whatsapp_number: formData.whatsapp_number,
          allow_patient_calls: formData.allow_patient_calls,
          is_active: true
        }]);
        if (error) throw error;
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData(initialFormState);
      fetchStaff(user.email);
    } catch (err) {
      alert("Error saving doctor: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(doctor) {
    const confirmMessage = `Removing Dr. ${doctor.name} will close their queue for today and hide them from the system. Are you sure?`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const { error } = await supabase.from('staff').update({ is_active: false }).eq('id', doctor.id);
      if (error) throw error;
      fetchStaff(user.email);
    } catch (err) {
      alert("Error removing doctor: " + err.message);
    }
  }

  return (
    <div>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Doctors & Staff Management</h2>
        <button onClick={() => { setFormData(initialFormState); setShowAddModal(true); }} className={styles.primaryBtn}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          Add Doctor
        </button>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center'}}>Loading doctors...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th>Role</th>
                <th>AI Call Transfer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id}>
                  <td style={{fontWeight: 500}}>{member.name}</td>
                  <td>{member.specialization || <span style={{color: '#9ca3af'}}>-</span>}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      textTransform: 'capitalize',
                      backgroundColor: member.role === 'doctor' ? '#e0e7ff' : '#f3f4f6',
                      color: member.role === 'doctor' ? '#4338ca' : '#4b5563'
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td>
                    {member.allow_patient_calls ? (
                      <span style={{color: '#059669', fontSize: '12px', fontWeight: 'bold'}}>Enabled</span>
                    ) : (
                      <span style={{color: '#9ca3af', fontSize: '12px', fontWeight: 'bold'}}>Disabled</span>
                    )}
                  </td>
                  <td>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button 
                        onClick={() => { setFormData(member); setShowEditModal(true); }}
                        style={{padding: '6px 12px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 500}}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleRemove(member)}
                        style={{padding: '6px 12px', fontSize: '12px', border: 'none', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 500}}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>No doctors found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {(showAddModal || showEditModal) && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h3 style={{marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold'}}>
              {showEditModal ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>
            <form onSubmit={handleSaveStaff} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              
              {!showEditModal && (
                <div>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white'}}>
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                </div>
              )}

              {formData.role === 'receptionist' && !showEditModal ? (
                <div>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Login Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
                </div>
              ) : null}

              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Name (required)</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={formData.role === 'doctor' ? "e.g. Dr. Sharma" : "e.g. Rahul"} style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              
              {formData.role === 'doctor' && (
                <div>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Specialization (optional)</label>
                  <input type="text" value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} placeholder="e.g. Cardiologist" style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
                </div>
              )}

              <div style={{borderTop: '1px solid #e5e7eb', marginTop: '0.5rem', paddingTop: '1rem'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>Direct Phone Number (optional)</label>
                <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 9876543210" style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
                <p style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>Used for Voice AI transfers.</p>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '500'}}>WhatsApp Number (optional)</label>
                <input type="text" value={formData.whatsapp_number || ''} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} placeholder="+91 9876543210" style={{width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>

              <div style={{marginTop: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500'}}>
                  <input 
                    type="checkbox" 
                    checked={formData.allow_patient_calls} 
                    onChange={e => setFormData({...formData, allow_patient_calls: e.target.checked})} 
                    style={{width: '16px', height: '16px'}}
                  />
                  Allow AI Voice Call Transfers
                </label>
                <p style={{fontSize: '12px', color: '#64748b', marginTop: '6px', marginLeft: '24px'}}>
                  If checked, the AI voice agent can route emergency or specific patient calls directly to this person's phone.
                </p>
              </div>
              
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} style={{flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: '#374151'}}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{flex: 1, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
