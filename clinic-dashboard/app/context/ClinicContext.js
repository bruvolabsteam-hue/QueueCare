/* eslint-disable */
'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const ClinicContext = createContext(null);

function formatTimeString(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export function ClinicProvider({ children }) {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [clinicId, setClinicId] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingClinic, setLoadingClinic] = useState(true);
  
  // Selected doctor for detailed modal/drawer
  const [activeDoctorModal, setActiveDoctorModal] = useState(null);

  // Initialize from cache immediately (0ms rehydration)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCid = urlParams.get('clinic_id');
      
      const cached = sessionStorage.getItem('qc_clinic_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // If there's a URL override that differs from cache, don't use cache
        if (urlCid && parsed.clinicId !== urlCid) {
          return;
        }
        
        if (parsed.clinicId) {
          setClinicId(parsed.clinicId);
          setClinic(parsed.clinic || null);
          setDoctors(parsed.doctors || []);
          setUser(parsed.user || null);
          setStaffData(parsed.staffData || null);
          setLoadingClinic(false);
        }
      }
    } catch (err) {
      console.warn('Cache rehydrate error:', err);
    }
  }, []);

  const refreshClinicData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser) {
        setLoadingClinic(false);
        return;
      }
      setUser(authUser);

      let cid = null;
      
      // Allow URL override for Super Admin impersonation
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlCid = urlParams.get('clinic_id');
        if (urlCid) cid = urlCid;
      }

      if (!cid) {
        // Find staff record
        let { data: staff } = await supabase
          .from('staff')
          .select('clinic_id, id, name, role, phone, email')
          .or(`email.eq.${authUser.email},id.eq.${authUser.id}`)
          .limit(1)
          .maybeSingle();

        cid = staff?.clinic_id;

        // Fallback: query clinics table directly by owner email
        if (!cid && authUser.email) {
          const { data: clinicRecord } = await supabase
            .from('clinics')
            .select('id, clinic_name, email')
            .eq('email', authUser.email)
            .maybeSingle();
          if (clinicRecord) {
            cid = clinicRecord.id;
          }
        }
      }

      if (!cid) {
        setLoadingClinic(false);
        return;
      }

      setClinicId(cid);
      setStaffData(staff || null);

      // Parallelize fetching clinic details, doctors, today settings, and queue count
      const today = new Date().toISOString().split('T')[0];

      const [clinicRes, docsRes, settingsRes, patientsRes] = await Promise.all([
        supabase.from('clinics').select('*').eq('id', cid).single(),
        supabase.from('staff').select('*').eq('clinic_id', cid).eq('role', 'doctor').eq('is_active', true).order('name'),
        supabase.from('doctor_daily_settings').select('*').eq('clinic_id', cid).eq('date', today),
        supabase.from('patients').select('id, doctor_id, status').eq('clinic_id', cid).gte('created_at', `${today}T00:00:00`)
      ]);

      const clinicDetails = clinicRes.data || null;
      setClinic(clinicDetails);

      const allDocs = docsRes.data || [];
      const allSettings = settingsRes.data || [];
      const allPatients = patientsRes.data || [];

      const settingsMap = {};
      allSettings.forEach(s => { settingsMap[s.doctor_id] = s; });

      const enrichedDoctors = allDocs.map(doc => {
        const s = settingsMap[doc.id];
        const docPatients = allPatients.filter(p => p.doctor_id === doc.id);
        const waitingCount = docPatients.filter(p => p.status === 'waiting').length;
        const calledCount = docPatients.filter(p => p.status === 'called').length;
        const doneCount = docPatients.filter(p => p.status === 'done').length;

        let statusText = 'Available / On Duty';
        let statusColor = '#10b981'; // emerald
        let isAvailable = true;
        let isLeave = false;
        let leaveReason = null;

        if (s) {
          if (s.is_leave) {
            isLeave = true;
            leaveReason = s.leave_reason || 'Personal Leave';
            statusText = `On Leave (${leaveReason})`;
            statusColor = '#ef4444'; // red
            isAvailable = false;
          } else if (!s.is_active) {
            statusText = 'Not Available Today';
            statusColor = '#f59e0b'; // amber
            isAvailable = false;
          } else {
            statusText = 'Available / On Duty';
            statusColor = '#10b981'; // emerald
            isAvailable = true;
          }
        }

        return {
          ...doc,
          todaySettings: s || null,
          isAvailable,
          isLeave,
          leaveReason,
          statusText,
          statusColor,
          startTime: s?.start_time ? formatTimeString(s.start_time) : '09:00 AM',
          endTime: s?.end_time ? formatTimeString(s.end_time) : '05:00 PM',
          mode: s?.mode || 'walk-in',
          timePerPatient: s?.time_per_patient_mins || 15,
          maxPatients: s?.max_patients || 30,
          queueStats: {
            total: docPatients.length,
            waiting: waitingCount,
            called: calledCount,
            done: doneCount,
          }
        };
      });

      setDoctors(enrichedDoctors);

      // If a modal is open, keep its doctor reference updated
      setActiveDoctorModal(current => {
        if (!current) return null;
        const fresh = enrichedDoctors.find(d => d.id === current.id);
        return fresh || current;
      });

      // Update cache
      try {
        sessionStorage.setItem('qc_clinic_cache', JSON.stringify({
          clinicId: cid,
          clinic: clinicDetails,
          staffData: staff,
          doctors: enrichedDoctors,
          user: { email: authUser.email, id: authUser.id }
        }));
      } catch (err) {}

    } catch (err) {
      console.error('Error refreshing clinic data:', err);
    } finally {
      setLoadingClinic(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshClinicData();
  }, [refreshClinicData]);

  const openDoctorDetails = useCallback((doctorOrId) => {
    if (!doctorOrId) return;
    if (typeof doctorOrId === 'string') {
      const found = doctors.find(d => d.id === doctorOrId);
      if (found) setActiveDoctorModal(found);
    } else {
      setActiveDoctorModal(doctorOrId);
    }
  }, [doctors]);

  const closeDoctorDetails = useCallback(() => {
    setActiveDoctorModal(null);
  }, []);

  return (
    <ClinicContext.Provider value={{
      clinicId,
      clinic,
      staffData,
      user,
      doctors,
      loadingClinic,
      refreshClinicData,
      activeDoctorModal,
      openDoctorDetails,
      closeDoctorDetails,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}
