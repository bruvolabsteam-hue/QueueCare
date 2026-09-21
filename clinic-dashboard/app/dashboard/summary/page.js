/* eslint-disable */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useClinic } from '../../context/ClinicContext';
import styles from '../table.module.css';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

export default function SummaryPage() {
  const supabase = createClient();
  const { clinicId: contextClinicId } = useClinic();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, waiting: 0, done: 0, skipped: 0 });

  const fetchTodayPatients = useCallback(async () => {
    let cid = contextClinicId;
    if (!cid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id')
        .or(`email.eq.${user.email},id.eq.${user.id}`)
        .limit(1)
        .maybeSingle();

      if (!staffData?.clinic_id) return;
      cid = staffData.clinic_id;
    }

    setLoading(true);
    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

    // Fetch all patients for this clinic today
    const { data } = await supabase.from('patients')
      .select('*, doctor:doctor_id(name)')
      .eq('clinic_id', cid)
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
  }, [contextClinicId, supabase]);

  useEffect(() => {
    fetchTodayPatients();
  }, [fetchTodayPatients]);

  // --- Data preparation for Recharts ---
  const pieData = [
    { name: 'Completed', value: stats.done, color: '#059669' },
    { name: 'Waiting', value: stats.waiting, color: '#d97706' },
    { name: 'Skipped/No-Show', value: stats.skipped, color: '#dc2626' }
  ].filter(d => d.value > 0);

  // Group by doctor
  const doctorMap = {};
  patients.forEach(p => {
    const docName = p.doctor ? `Dr. ${p.doctor.name}` : 'Unassigned';
    if (!doctorMap[docName]) doctorMap[docName] = 0;
    doctorMap[docName]++;
  });
  
  const barData = Object.keys(doctorMap).map(doc => ({
    name: doc,
    patients: doctorMap[doc]
  }));
  // ------------------------------------

  return (
    <div>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>End of Day Summary & Analytics</h2>
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

      {/* --- Data Visualization Section --- */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>Patient Status Breakdown</h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '300px', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>Patients per Doctor</h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}}/>
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}}/>
                <Bar dataKey="patients" fill="#38B6FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* ---------------------------------- */}

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
