'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../utils/supabase/client';
import styles from '../dashboard.module.css';

export default function SupportPage() {
  const [clinic, setClinic] = useState(null);
  const [supportNumber, setSupportNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [issueType, setIssueType] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // Load clinic info to include in the message
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staffData } = await supabase.from('staff').select('clinic_id').eq('id', user.id).single();
        if (staffData) {
          const { data: clinicData } = await supabase.from('clinics').select('clinic_name').eq('id', staffData.clinic_id).single();
          setClinic(clinicData);
        }
      }
      
      // Load global support number
      const { data: globalSettings } = await supabase.from('global_settings').select('support_whatsapp_number').limit(1).single();
      if (globalSettings) {
        setSupportNumber(globalSettings.support_whatsapp_number);
      }
      
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!supportNumber) {
      alert("Support number is not configured by the system administrator yet.");
      return;
    }
    
    const clinicName = clinic?.clinic_name || "Unknown Clinic";
    const text = `*Support Request from ${clinicName}*%0A*Issue Type:* ${issueType}%0A*Message:* ${message}`;
    
    const cleanNumber = supportNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${text}`;
    
    window.open(url, '_blank');
  };

  if (loading) return <div style={{padding: '2rem'}}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '2rem'}}>Help & Support</h1>
      
      <div style={{background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '1.5rem'}}>Contact Clinic Support</h2>
        <p style={{fontSize: '14px', color: '#64748b', marginBottom: '2rem'}}>
          Please describe your issue below. When you click submit, it will securely send a message to our official WhatsApp support team.
        </p>

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div>
            <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>What type of issue are you facing?</label>
            <select 
              value={issueType} 
              onChange={(e) => setIssueType(e.target.value)}
              style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px'}}
            >
              <option value="General Inquiry">General Inquiry</option>
              <option value="Queue is stuck / not moving">Queue is stuck / not moving</option>
              <option value="Patients not receiving SMS/WhatsApp">Patients not receiving SMS/WhatsApp</option>
              <option value="Login / Account Issue">Login / Account Issue</option>
              <option value="Billing / Payment Issue">Billing / Payment Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>Describe the problem</label>
            <textarea 
              required
              placeholder="Please provide details about what happened..."
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', minHeight: '120px'}}
            />
          </div>

          <button 
            type="submit" 
            style={{padding: '14px', background: '#25D366', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
          >
            <svg style={{width: '20px', height: '20px'}} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Send to Clinic Support
          </button>
        </form>
      </div>
    </div>
  );
}
