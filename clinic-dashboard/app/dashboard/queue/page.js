/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../utils/supabase/client';
import QueueView from '../components/QueueView';

export default function LiveQueuePage() {
  const [clinicId, setClinicId] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: staffData } = await supabase.from('staff').select('clinic_id, id').eq('email', user.email).single();
      if (!staffData) return;
      
      setClinicId(staffData.clinic_id);
      setStaffId(staffData.id);

      // Fetch Doctors
      const { data: doctorsData } = await supabase.from('staff').select('id, name').eq('clinic_id', staffData.clinic_id).eq('role', 'doctor');
      setDoctors(doctorsData || []);
    }
    loadData();
  }, []);

  if (!clinicId) return <div style={{padding: '2rem'}}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <QueueView 
        doctorId="all" 
        doctors={doctors} 
        clinicId={clinicId} 
        staffId={staffId} 
      />
    </div>
  );
}
