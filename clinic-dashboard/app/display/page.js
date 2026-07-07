'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function DisplayPage() {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [clinicId, setClinicId] = useState(null);
  
  // To handle the ping sound
  const audioRef = useRef(null);
  const prevToken = useRef(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const urlParams = new URLSearchParams(window.location.search);
      let cId = urlParams.get('clinic_id');
      
      if (!cId) {
        const { data } = await supabase.from('clinics').select('*').limit(1).single();
        if (data) {
          cId = data.id;
          setClinic(data);
        }
      } else {
        const { data } = await supabase.from('clinics').select('*').eq('id', cId).single();
        if (data) setClinic(data);
      }
      
      if (!cId) return;
      setClinicId(cId);

      // Fetch the currently called patient for today
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = new Date(today).toISOString();
      
      const fetchCurrent = async () => {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', cId)
          .eq('status', 'called')
          .gte('created_at', startOfDay)
          .order('called_at', { ascending: false })
          .limit(1)
          .single();
          
        if (data) {
          setCurrentPatient(data);
          prevToken.current = data.token_number;
        }
      };
      
      await fetchCurrent();

      // Subscribe to real-time changes
      const channel = supabase.channel('realtime_display')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients', filter: `clinic_id=eq.${cId}` }, payload => {
          if (payload.new.status === 'called') {
            setCurrentPatient(payload.new);
            // Play sound if token changed
            if (payload.new.token_number !== prevToken.current) {
               if (audioRef.current) {
                 audioRef.current.play().catch(e => console.log('Audio play failed', e));
               }
               prevToken.current = payload.new.token_number;
            }
          } else if (payload.new.status === 'done' && currentPatient?.id === payload.new.id) {
             setCurrentPatient(null);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel) };
    }
    loadData();
  }, [currentPatient?.id]);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: clinic?.brand_color || '#0f172a', 
      color: '#fff', 
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Audio element for ding sound (Needs a valid source in production) */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto"></audio>

      {/* Header */}
      <header style={{ padding: '2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>
          {clinic?.clinic_name || 'OmniCare Clinic'}
        </h1>
        <div style={{ fontSize: '2rem', opacity: 0.8 }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        
        {currentPatient ? (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontWeight: '500' }}>
              Currently Serving
            </h2>
            <div style={{ 
              fontSize: '16rem', 
              fontWeight: '900', 
              lineHeight: '1',
              textShadow: '0 10px 30px rgba(0,0,0,0.3)',
              marginBottom: '2rem'
            }}>
              {currentPatient.token_number}
            </div>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: '#fbbf24' }}>
              {currentPatient.name}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <svg style={{ width: '120px', height: '120px', margin: '0 auto 2rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h2 style={{ fontSize: '4rem', fontWeight: '500' }}>Please Wait</h2>
            <p style={{ fontSize: '2rem', marginTop: '1rem' }}>The doctor will call the next patient shortly.</p>
          </div>
        )}

      </main>

      {/* Footer */}
      {clinic?.welcome_message && (
        <footer style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', textAlign: 'center' }}>
          <marquee style={{ fontSize: '2.5rem', fontWeight: '500' }}>{clinic.welcome_message}</marquee>
        </footer>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
