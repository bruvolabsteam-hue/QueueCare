'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '../table.module.css';

export default function SummaryPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, waiting: 0, done: 0, skipped: 0 });

  useEffect(() => {
    fetchTodayPatients();
  }, []);

  async function fetchTodayPatients() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get clinic
    const { data: staffData } = await supabase.from('staff').select('clinic_id').eq('email', user.email).single();
    if (!staffData) return;

    const today = new Date().toISOString().split('T')[0];

    // Fetch all patients for this clinic today
    const { data } = await supabase.from('patients')
      .select('*, doctor:doctor_id(name)')
      .eq('clinic_id', staffData.clinic_id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .order('token_number', { ascending: true });

    if (data) {
      setPatients(data);
      
      // Calculate stats
      const total = data.length;
      const waiting = data.filter(p => p.status === 'waiting').length;
      const done = data.filter(p => p.status === 'done').length;
      const skipped = data.filter(p => p.status === 'skipped').length;
      setStats({ total, waiting, done, skipped });
    }
    
    setLoading(false);
  }

  return (
    <div>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>End of Day Summary</h2>
        <button 
          onClick={() => window.print()}
          style={{padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center'}}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Print / Save as PDF
        </button>
      </div>

      <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
        <div style={{flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <p style={{color: '#6b7280', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0'}}>Total Patients</p>
          <p style={{fontSize: '2rem', fontWeight: 800, margin: 0, color: '#111827'}}>{stats.total}</p>
        </div>
        <div style={{flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <p style={{color: '#6b7280', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0'}}>Completed (Done)</p>
          <p style={{fontSize: '2rem', fontWeight: 800, margin: 0, color: '#059669'}}>{stats.done}</p>
        </div>
        <div style={{flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <p style={{color: '#6b7280', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0'}}>Skipped / No Show</p>
          <p style={{fontSize: '2rem', fontWeight: 800, margin: 0, color: '#dc2626'}}>{stats.skipped}</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center'}}>Loading today's patients...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Arrival Time</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight: 800}}>{p.token_number}</td>
                  <td style={{fontWeight: 500}}>{p.name}</td>
                  <td>{p.phone}</td>
                  <td>{p.doctor ? `Dr. ${p.doctor.name}` : '-'}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      textTransform: 'capitalize',
                      backgroundColor: p.status === 'done' ? '#d1fae5' : p.status === 'waiting' ? '#fef3c7' : '#fee2e2',
                      color: p.status === 'done' ? '#059669' : p.status === 'waiting' ? '#d97706' : '#dc2626'
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td>{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>No patients recorded today.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
