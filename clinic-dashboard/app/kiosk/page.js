/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function KioskPage() {
  const [step, setStep] = useState('loading'); // loading -> select_doctor -> details -> success
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tokenNumber, setTokenNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clinicId, setClinicId] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadClinic() {
      const urlParams = new URLSearchParams(window.location.search);
      let cId = urlParams.get('clinic_id');
      
      if (!cId) {
        const { data } = await supabase.from('clinics').select('id').limit(1).single();
        if (data) cId = data.id;
      }
      setClinicId(cId);

      if (cId) {
        // Fetch Doctors
        const { data: doctorsData } = await supabase
          .from('staff')
          .select('id, name')
          .eq('clinic_id', cId)
          .eq('role', 'doctor');
          
        setDoctors(doctorsData || []);
        
        if (doctorsData && doctorsData.length > 0) {
          setStep('select_doctor');
        } else {
          setStep('details');
        }
      }
    }
    loadClinic();
  }, []);

  const handleSelectDoctor = (doctorId) => {
    setSelectedDoctorId(doctorId);
    setStep('details');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !clinicId) return;
    
    setLoading(true);
    
    const { data, error } = await supabase.rpc('generate_daily_token', {
      p_clinic_id: clinicId,
      p_name: name,
      p_phone: phone,
      p_registration_method: 'kiosk',
      p_doctor_id: selectedDoctorId || null
    });

    setLoading(false);
    
    if (error) {
      alert('Failed to generate token: ' + error.message);
    } else {
      setTokenNumber(data);
      setStep('success');
      
      // Reset after 5 seconds
      setTimeout(() => {
        setStep(doctors.length > 0 ? 'select_doctor' : 'details');
        setName('');
        setPhone('');
        setSelectedDoctorId(null);
        setTokenNumber(null);
      }, 5000);
    }
  };

  if (step === 'loading') {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>Loading / लोड हो रहा है...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      
      <div style={{ width: '100%', maxWidth: '600px', background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        {step === 'select_doctor' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                Select Doctor / डॉक्टर चुनें
              </h1>
              <p style={{ fontSize: '18px', color: '#6b7280' }}>
                Who would you like to see? / आप किस डॉक्टर से मिलना चाहते हैं?
              </p>
            </div>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {doctors.map(doc => (
                <button 
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc.id)}
                  style={{ width: '100%', padding: '24px', fontSize: '24px', fontWeight: 'bold', background: '#f8fafc', color: '#2563eb', border: '2px solid #bfdbfe', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {doc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                Welcome / आपका स्वागत है
              </h1>
              <p style={{ fontSize: '18px', color: '#6b7280' }}>
                Enter your details to get a token / टोकन पाने के लिए अपना विवरण दर्ज करें
              </p>
              {selectedDoctorId && (
                <p style={{ fontSize: '16px', color: '#2563eb', fontWeight: 'bold', marginTop: '0.5rem' }}>
                  For: {doctors.find(d => d.id === selectedDoctorId)?.name}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '20px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Your Name / आपका नाम
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  style={{ width: '100%', padding: '16px', fontSize: '24px', border: '2px solid #d1d5db', borderRadius: '12px', outline: 'none' }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '20px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Phone Number / फ़ोन नंबर
                </label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  style={{ width: '100%', padding: '16px', fontSize: '24px', border: '2px solid #d1d5db', borderRadius: '12px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {doctors.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setStep('select_doctor')}
                    style={{ flex: 1, padding: '20px', fontSize: '24px', fontWeight: 'bold', background: '#f3f4f6', color: '#374151', borderRadius: '16px', border: 'none', cursor: 'pointer' }}
                  >
                    Back / वापस
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2, padding: '20px', fontSize: '24px', fontWeight: 'bold', background: '#10b981', color: 'white', borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3)' }}
                >
                  {loading 
                    ? 'Generating... / बनाया जा रहा है...' 
                    : 'Get Token / टोकन प्राप्त करें'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '80px', height: '80px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <svg style={{ width: '40px', height: '40px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              Success! / सफलता!
            </h1>
            <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '1rem' }}>
              Your token number is / आपका टोकन नंबर है:
            </p>
            <div style={{ fontSize: '96px', fontWeight: '900', color: '#2563eb', lineHeight: '1', marginBottom: '1.5rem' }}>
              {tokenNumber}
            </div>
            <p style={{ fontSize: '16px', color: '#10b981', fontWeight: '600' }}>
              ✅ You will receive a WhatsApp message with your estimated turn time
            </p>
            <p style={{ fontSize: '14px', color: '#10b981' }}>
              ✅ आपको WhatsApp पर आपकी बारी का अनुमानित समय मिलेगा
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
