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
        {/* Card 1: Total Patients */}
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <span className={styles.statTitle}>Total Patients Today</span>
            <div className={styles.statIconBox} style={{ background: 'rgba(56, 182, 255, 0.15)', color: '#0284c7' }}>
              👥
            </div>
          </div>
          <div className={styles.statValue}>{stats.totalPatientsToday}</div>
          <div className={`${styles.statTrend} ${styles.neutral}`}>
            <span>⚡</span> Tokens generated today
          </div>
        </div>
        
        {/* Card 2: Average Wait Time */}
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <span className={styles.statTitle}>Average Time / Patient</span>
            <div className={styles.statIconBox} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
              ⏱️
            </div>
          </div>
          <div className={styles.statValue}>{stats.avgWaitTime} <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#64748b' }}>mins</span></div>
          <div className={styles.statTrend}>
            <span>✓</span> {stats.isFallbackWaitTime ? "Global clinic baseline" : "Optimized today"}
          </div>
        </div>

        {/* Card 3: Active Doctors */}
        <div 
          className={styles.statCard} 
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (doctors.length > 0) openDoctorDetails(doctors[0]);
          }}
          title="Click to view all clinic doctor profiles"
        >
          <div className={styles.statCardTop}>
            <span className={styles.statTitle}>Active Doctors</span>
            <div className={styles.statIconBox} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
              🩺
            </div>
          </div>
          <div className={styles.statValue}>{stats.activeDoctors}</div>
          <div className={`${styles.statTrend} ${styles.neutral}`}>
            {doctors.length > 0 ? (
              <span>🟢 {doctors.map(d => d.name.replace(/^Dr\.?\s*/i, '')).join(', ')}</span>
            ) : (
              'Currently registered staff'
            )}
          </div>
        </div>
      </div>

      {/* Recent Patients Table Card */}
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
              display: 'inline-block'
            }} />
            Recent Walk-ins (Today)
          </h3>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', background: 'rgba(56, 182, 255, 0.08)', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid rgba(56, 182, 255, 0.2)' }}>
            Live Queue Feed
          </span>
        </div>

        {stats.recentPatients.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <p style={{ margin: 0, fontWeight: 500 }}>No patients have arrived yet today.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid #ebdcc9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(252, 244, 231, 0.7)', textAlign: 'left', borderBottom: '1px solid #ebdcc9' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPatients.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(56, 182, 255, 0.12)',
                        color: '#0284c7',
                        fontWeight: '800',
                        fontSize: '0.9rem'
                      }}>
                        #{p.token_number}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.88rem' }}>
                      {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        textTransform: 'capitalize',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '999px',
                        background: p.status === 'waiting' ? '#fef3c7' : '#ecfdf5',
                        color: p.status === 'waiting' ? '#b45309' : '#047857',
                        border: `1px solid ${p.status === 'waiting' ? '#fde68a' : '#a7f3d0'}`
                      }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
