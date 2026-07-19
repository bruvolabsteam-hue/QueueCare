/* eslint-disable */
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

function formatTime(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE = {
  called:  { bg: '#dbeafe', color: '#1d4ed8' },
  done:    { bg: '#d1fae5', color: '#047857' },
  skipped: { bg: '#ffedd5', color: '#c2410c' },
  no_show: { bg: '#fee2e2', color: '#b91c1c' },
  waiting: { bg: '#f3f4f6', color: '#374151' },
};

export default function PatientsPage() {
  const [patients, setPatients]         = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [clinicId, setClinicId]         = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: staffData } = await supabase
        .from('staff').select('clinic_id').eq('email', user.email).single();
      if (!staffData?.clinic_id) { setLoading(false); return; }

      setClinicId(staffData.clinic_id);

      const today = new Date().toISOString().split('T')[0];

      // Patients today with doctor name joined
      const { data, error } = await supabase
        .from('patients')
        .select('*, doctor:doctor_id(id, name)')
        .eq('clinic_id', staffData.clinic_id)
        .gte('created_at', today + 'T00:00:00')
        .order('queue_position', { ascending: true });

      if (!error && data) setPatients(data);

      // Doctors list for filter
      const { data: doctorsData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('clinic_id', staffData.clinic_id)
        .eq('role', 'doctor');

      setDoctors(doctorsData || []);
      setLoading(false);
    }
    loadData();

    // Realtime subscription
    const channel = supabase.channel('patients-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
        // Re-load on any change
        loadData();
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Filtered list
  const filtered = patients.filter(p => {
    const doctorMatch = selectedDoctor === 'all' || p.doctor_id === selectedDoctor;
    const statusMatch = selectedStatus === 'all' || p.status === selectedStatus;
    return doctorMatch && statusMatch;
  });

  const counts = {
    total:   patients.length,
    waiting: patients.filter(p => p.status === 'waiting').length,
    done:    patients.filter(p => p.status === 'done').length,
    skipped: patients.filter(p => p.status === 'skipped').length,
    no_show: patients.filter(p => p.status === 'no_show').length,
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>Patients / Queue Records</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', marginBottom: 0, fontSize: '13px' }}>Today's complete token log — live updating.</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: counts.total,   bg: '#f3f4f6', color: '#374151' },
          { label: 'Waiting', value: counts.waiting, bg: '#fef3c7', color: '#92400e' },
          { label: 'Done',    value: counts.done,    bg: '#d1fae5', color: '#047857' },
          { label: 'Skipped', value: counts.skipped, bg: '#ffedd5', color: '#c2410c' },
          { label: 'No Show', value: counts.no_show, bg: '#fee2e2', color: '#b91c1c' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: s.color, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>FILTER BY DOCTOR</label>
          <select
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' }}
          >
            <option value="all">All Doctors</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>FILTER BY STATUS</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' }}
          >
            <option value="all">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="called">Called</option>
            <option value="done">Done</option>
            <option value="skipped">Skipped</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Showing <strong style={{ color: '#111827' }}>{filtered.length}</strong> of {patients.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Loading records...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: '#374151' }}>No records found.</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Adjust filters or wait for patients to register.</div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <tr>
                {['TOKEN', 'PATIENT NAME', 'PHONE', 'DOCTOR', 'STATUS', 'ARRIVAL TIME'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const s = STATUS_STYLE[p.status] || STATUS_STYLE.waiting;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa', transition: 'background 0.1s' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '17px', color: '#2563eb' }}>{p.token_number}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827' }}>{p.name}</td>
                    <td style={{ padding: '14px 16px', color: '#4b5563', fontFamily: 'monospace', fontSize: '13px' }}>{p.phone}</td>
                    <td style={{ padding: '14px 16px', color: '#374151' }}>{p.doctor?.name || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color }}>
                        {p.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>{formatTime(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
