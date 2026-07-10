/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../utils/supabase/client';
import styles from '../dashboard.module.css';

export default function SettingsPage() {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('id', user.id)
        .single();
        
      if (staffData) {
        const { data: clinicData } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', staffData.clinic_id)
          .single();
        setClinic(clinicData);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase.from('clinics').update({
      clinic_name: clinic.clinic_name,
      brand_color: clinic.brand_color,
      tagline: clinic.tagline,
      welcome_message: clinic.welcome_message,
      default_language: clinic.default_language,
      regional_language: clinic.regional_language,
      avg_time_per_patient_mins: clinic.avg_time_per_patient_mins,
      auto_skip_mins: clinic.auto_skip_mins,
      alert_ahead_count: clinic.alert_ahead_count,
      whitelabel_name: clinic.whitelabel_name,
      show_powered_by: clinic.show_powered_by ?? true,
      whatsapp_sender_number: clinic.whatsapp_sender_number,
      exotel_caller_id: clinic.exotel_caller_id
    }).eq('id', clinic.id);

    setSaving(false);
    if (error) {
      console.error(error);
      alert('Error saving settings: ' + error.message);
    } else {
      alert('Settings saved successfully!');
    }
  };

  if (loading) return <div style={{padding: '2rem'}}>Loading...</div>;
  if (!clinic) return <div style={{padding: '2rem'}}>No clinic profile found. Create an account to register a clinic.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '2rem'}}>Clinic Settings</h1>
      
      <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
        
        <section style={{background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '1rem'}}>Branding & Whitelabel Identity</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Clinic Name</label>
              <input type="text" value={clinic.clinic_name || ''} onChange={e => setClinic({...clinic, clinic_name: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Brand Color</label>
              <input type="color" value={clinic.brand_color || '#000000'} onChange={e => setClinic({...clinic, brand_color: e.target.value})} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Tagline</label>
              <input type="text" value={clinic.tagline || ''} onChange={e => setClinic({...clinic, tagline: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
            </div>
            <div style={{borderTop: '1px solid #e5e7eb', marginTop: '0.5rem', paddingTop: '1rem'}}>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Whitelabel Brand Name (Overrides "BruvoFlow")</label>
              <input type="text" placeholder="e.g. Apollo Hospitals" value={clinic.whitelabel_name || ''} onChange={e => setClinic({...clinic, whitelabel_name: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
              <p style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>Replaces the word "BruvoFlow" in the Patient Kiosk and SMS/WhatsApp messages.</p>
            </div>
            <div style={{marginTop: '0.5rem'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}>
                <input type="checkbox" checked={clinic.show_powered_by ?? true} onChange={e => setClinic({...clinic, show_powered_by: e.target.checked})} style={{width: '16px', height: '16px'}} />
                Show "Powered by BruvoFlow" badge
              </label>
            </div>
          </div>
        </section>

        <section style={{background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '1rem'}}>Communication Sender Numbers</h2>
          <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '1rem'}}>Set your specific numbers for sending WhatsApp updates and automated AI Voice calls.</p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>WhatsApp Sender Number</label>
              <input type="text" placeholder="+919876543210" value={clinic.whatsapp_sender_number || ''} onChange={e => setClinic({...clinic, whatsapp_sender_number: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Voice Call (Exotel/Vapi) Caller ID</label>
              <input type="text" placeholder="08047112345" value={clinic.exotel_caller_id || ''} onChange={e => setClinic({...clinic, exotel_caller_id: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
            </div>
          </div>
        </section>

        <section style={{background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '1rem'}}>Queue & Operations</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Avg Time per Patient (mins)</label>
                <input type="number" value={clinic.avg_time_per_patient_mins || 10} onChange={e => setClinic({...clinic, avg_time_per_patient_mins: parseInt(e.target.value)})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Auto-Skip Timer (mins)</label>
                <input type="number" value={clinic.auto_skip_mins || 5} onChange={e => setClinic({...clinic, auto_skip_mins: parseInt(e.target.value)})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
              </div>
            </div>
            <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Alert Patients X Tokens Ahead</label>
                <input type="number" value={clinic.alert_ahead_count || 3} onChange={e => setClinic({...clinic, alert_ahead_count: parseInt(e.target.value)})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Welcome Message (Kiosk)</label>
              <textarea value={clinic.welcome_message || ''} onChange={e => setClinic({...clinic, welcome_message: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px'}} />
            </div>
          </div>
        </section>

        <section style={{background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '0.5rem'}}>🌐 WhatsApp Language</h2>
          <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '1rem'}}>All WhatsApp messages will be sent in English + your selected regional language automatically.</p>
          <div>
            <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Regional Language for Patients</label>
            <select value={clinic.regional_language || 'hi'} onChange={e => setClinic({...clinic, regional_language: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '15px'}}>
              <option value="hi">🇮🇳 Hindi (हिंदी)</option>
              <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
              <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
              <option value="ml">🇮🇳 Malayalam (മലയാളം)</option>
              <option value="te">🇮🇳 Telugu (తెలుగు)</option>
              <option value="mr">🇮🇳 Marathi (मराठी)</option>
              <option value="bn">🇮🇳 Bengali (বাংলা)</option>
              <option value="gu">🇮🇳 Gujarati (ગુજરાતી)</option>
              <option value="pa">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</option>
            </select>
          </div>
        </section>

        <button type="submit" disabled={saving} style={{padding: '12px', background: '#2563eb', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
