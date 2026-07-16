'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatients() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Fetch user's clinic ID
        const { data: staffData } = await supabase.from('staff').select('clinic_id').eq('id', session.user.id).single();
        if (!staffData?.clinic_id) return;

        // Fetch today's patients
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('patients')
          .select('*, doctors:doctor_id(name)')
          .eq('clinic_id', staffData.clinic_id)
          .gte('created_at', today)
          .order('queue_position', { ascending: true });

        if (!error && data) {
          setPatients(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>Patients / Queue Records</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>View today's token records here.</p>
      
      {loading ? (
        <p>Loading records...</p>
      ) : patients.length === 0 ? (
        <p>No patients registered today.</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Token #</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Phone</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Doctor</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#2563eb' }}>{p.token_number}</td>
                  <td style={{ padding: '1rem' }}>{p.name}</td>
                  <td style={{ padding: '1rem' }}>{p.phone}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold',
                      background: p.status === 'called' ? '#dbeafe' : p.status === 'done' ? '#d1fae5' : p.status === 'skipped' ? '#ffedd5' : p.status === 'no_show' ? '#fee2e2' : '#f3f4f6',
                      color: p.status === 'called' ? '#1d4ed8' : p.status === 'done' ? '#047857' : p.status === 'skipped' ? '#c2410c' : p.status === 'no_show' ? '#b91c1c' : '#374151'
                    }}>
                      {p.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#4b5563' }}>{p.doctors?.name || '-'}</td>
                  <td style={{ padding: '1rem', color: '#6b7280', fontSize: '14px' }}>
                    {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
