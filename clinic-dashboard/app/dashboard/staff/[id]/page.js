'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useClinic } from '../../../context/ClinicContext';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './doctor-profile.module.css';
import { useParams } from 'next/navigation';
import CalendarPage from '../../calendar/page';

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = params?.id;
  const supabase = createClient();
  const { clinicId: contextClinicId } = useClinic();
  
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDoctor = useCallback(async () => {
    if (!contextClinicId || !doctorId) return;
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', doctorId)
        .eq('clinic_id', contextClinicId)
        .single();
        
      if (error) throw error;
      setDoctor(data);
    } catch (err) {
      console.error('Error fetching doctor:', err);
    } finally {
      setLoading(false);
    }
  }, [contextClinicId, doctorId, supabase]);

  useEffect(() => {
    fetchDoctor();
  }, [fetchDoctor]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading doctor details...</div>;
  }

  if (!doctor) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link href="/dashboard/staff" className={styles.backLink}>
          <ChevronLeft size={16} /> Back to Staff
        </Link>
        <div style={{ marginTop: '2rem' }}>Doctor not found or you do not have permission.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/dashboard/staff" className={styles.backLink}>
        <ChevronLeft size={16} /> Back to Staff
      </Link>
      
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {doctor.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>Dr. {doctor.name}</h1>
          <p className={styles.specialization}>{doctor.specialization || 'General Practitioner'}</p>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>{doctor.phone || 'N/A'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Role</span>
              <span className={styles.detailValue} style={{ textTransform: 'capitalize' }}>{doctor.role}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>AI Calls</span>
              <span className={styles.detailValue}>
                {doctor.allow_patient_calls ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <span className={styles.detailValue}>
                {doctor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.calendarSection}>
        <h2 className={styles.sectionTitle}>Doctor's Calendar & Schedule</h2>
        <p className={styles.sectionDesc}>
          Manage shifts, working hours, and leaves specifically for Dr. {doctor.name}.
        </p>
        
        <div className={styles.calendarWrapper}>
          <div style={{ height: '700px', overflowY: 'auto' }}>
            <CalendarPage defaultDoctorId={doctorId} />
          </div>
        </div>
      </div>
    </div>
  );
}
