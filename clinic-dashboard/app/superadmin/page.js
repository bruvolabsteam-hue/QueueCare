'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function SuperAdminPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    async function loadGlobalSettings() {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (data) {
        setWhatsappNumber(data.support_whatsapp_number || '');
      }
      setLoading(false);
    }
    loadGlobalSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    // Check if row exists
    const { data: existingData } = await supabase.from('global_settings').select('id').limit(1).single();
    
    let error;
    if (existingData) {
      const { error: updateError } = await supabase
        .from('global_settings')
        .update({ support_whatsapp_number: whatsappNumber })
        .eq('id', existingData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('global_settings')
        .insert([{ support_whatsapp_number: whatsappNumber }]);
      error = insertError;
    }

    setSaving(false);
    if (error) {
      console.error(error);
      setMessage('Error saving. Make sure global_settings table exists.');
    } else {
      setMessage('Successfully saved Support Number!');
    }
  };

  if (loading) return <div style={{padding: '2rem', fontFamily: 'sans-serif'}}>Loading Super Admin...</div>;

  return (
    <div style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1e293b', color: 'white', padding: '1rem', borderRadius: '8px 8px 0 0' }}>
        <h1 style={{fontSize: '20px', fontWeight: 'bold', margin: 0}}>Super Admin Dashboard</h1>
      </div>
      
      <div style={{ background: 'white', padding: '2rem', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '1rem', color: '#334155'}}>Global Configuration</h2>
        
        {message && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', background: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#991b1b' : '#166534', borderRadius: '4px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div>
            <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569'}}>
              Official WhatsApp Support Number
            </label>
            <input 
              type="text" 
              placeholder="e.g. +919876543210" 
              value={whatsappNumber} 
              onChange={e => setWhatsappNumber(e.target.value)} 
              style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px'}} 
            />
            <p style={{fontSize: '13px', color: '#64748b', marginTop: '6px'}}>
              This number is used by all clinics when they request help from their dashboard. Include country code.
            </p>
          </div>
          
          <button 
            type="submit" 
            disabled={saving} 
            style={{padding: '12px', background: '#3b82f6', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px'}}
          >
            {saving ? 'Saving...' : 'Update Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
