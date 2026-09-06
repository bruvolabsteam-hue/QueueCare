/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useClinic } from '../context/ClinicContext';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const supabase = createClient();
  const { clinicId, doctors, openDoctorDetails } = useClinic();
  const [stats, setStats] = useState({
    totalPatientsToday: 0,
    avgWaitTime: 10,
    activeDoctors: 0,
    recentPatients: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) return;

    let isMounted = true;
    async function fetchDashboardData() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00`;

      // Parallelize queries
      const [patientsRes, doctorsRes, settingsRes, clinicRes] = await Promise.all([
        supabase
          .from('patients')
          .select('*', { count: 'exact' })
          .eq('clinic_id', clinicId)
          .gte('created_at', startOfDay)
          .order('created_at', { ascending: false }),
        supabase
          .from('staff')
          .select('*', { count: 'exact' })
          .eq('clinic_id', clinicId)
          .eq('role', 'doctor')
          .eq('is_active', true),
        supabase
          .from('doctor_daily_settings')
          .select('time_per_patient_mins')
          .eq('clinic_id', clinicId)
          .eq('date', today)
          .eq('is_active', true),
        supabase
          .from('clinics')
          .select('avg_time_per_patient_mins')
          .eq('id', clinicId)
          .maybeSingle()
      ]);

      if (!isMounted) return;

      let avgWait = 10;
      let isFallbackWaitTime = false;
      const dailySettings = settingsRes.data || [];
      if (dailySettings.length > 0) {
        const total = dailySettings.reduce((sum, s) => sum + (s.time_per_patient_mins || 0), 0);
        avgWait = Math.round(total / dailySettings.length);
      } else if (clinicRes.data?.avg_time_per_patient_mins) {
        isFallbackWaitTime = true;
        avgWait = clinicRes.data.avg_time_per_patient_mins;
      }

      setStats({
        totalPatientsToday: patientsRes.count || (patientsRes.data || []).length || 0,
        avgWaitTime: avgWait,
        isFallbackWaitTime,
        activeDoctors: doctorsRes.count || (doctorsRes.data || []).length || (doctors || []).length || 0,
        recentPatients: (patientsRes.data || []).slice(0, 5)
      });
      setLoading(false);
    }

    fetchDashboardData();
    return () => { isMounted = false; };
  }, [clinicId, supabase, doctors]);

  return (
    <div>
      {!stats.activeDoctors && stats.totalPatientsToday === 0 && stats.avgWaitTime === 0 && stats.recentPatients.length === 0 ? (
        <div style={{padding: '2rem', textAlign: 'center'}}>
           <h3>Setting up your clinic workspace...</h3>
           <p style={{color: 'var(--color-text-secondary)'}}>If this takes more than a few seconds, please contact support.</p>
        </div>
      ) : (
      <>
      <div className={styles.grid}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Total Patients Today</div>
          <div className={styles.statValue}>{stats.totalPatientsToday}</div>
          <div className={styles.statTrend} style={{color: '#6b7280'}}>
            Tokens generated today
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statTitleHeader}>
            <div className={styles.statTitle}>Average Time / Patient</div>
          </div>
          <div className={styles.statValue}>{stats.avgWaitTime} mins</div>
          <div className={styles.statTrend} style={{color: '#6b7280'}}>
            {stats.isFallbackWaitTime ? "Based on global clinic setting" : "Based on today's doctor setup"}
          </div>
        </div>

        <div 
          className={styles.statCard} 
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => {
            if (doctors.length > 0) openDoctorDetails(doctors[0]);
          }}
          title="Click to view all clinic doctor profiles"
        >
          <div className={styles.statTitle}>Active Doctors</div>
          <div className={styles.statValue}>{stats.activeDoctors}</div>
          <div className={styles.statTrend} style={{color: '#0284c7', fontWeight: '600'}}>
            {doctors.length > 0 ? (
              <span>🩺 {doctors.map(d => d.name.replace(/^Dr\.?\s*/i, '')).join(', ')}</span>
            ) : (
              'Currently registered staff'
            )}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Recent Walk-ins (Today)</h3>
        {stats.recentPatients.length === 0 ? (
          <p style={{color: 'var(--color-text-secondary)'}}>No patients have arrived yet today.</p>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '1rem'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280'}}>
                <th style={{padding: '12px 8px'}}>Token</th>
                <th style={{padding: '12px 8px'}}>Name</th>
                <th style={{padding: '12px 8px'}}>Time</th>
                <th style={{padding: '12px 8px'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPatients.map(p => (
                <tr key={p.id} style={{borderBottom: '1px solid #f3f4f6'}}>
                  <td style={{padding: '12px 8px', fontWeight: 'bold', color: '#2563eb'}}>#{p.token_number}</td>
                  <td style={{padding: '12px 8px'}}>{p.name}</td>
                  <td style={{padding: '12px 8px', color: '#6b7280'}}>{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td style={{padding: '12px 8px'}}>
                     <span style={{textTransform: 'capitalize', fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: p.status === 'waiting' ? '#fef3c7' : '#d1fae5', color: p.status === 'waiting' ? '#d97706' : '#059669'}}>
                        {p.status}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}
    </div>
  );
}
