'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function SuperAdminPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [voiceApiKey, setVoiceApiKey] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  
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
        setAnthropicApiKey(data.anthropic_api_key || '');
        setVoiceApiKey(data.voice_api_key || '');
        setWhatsappApiKey(data.whatsapp_api_key || '');
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
    
    const updateData = {
      support_whatsapp_number: whatsappNumber,
      anthropic_api_key: anthropicApiKey,
      voice_api_key: voiceApiKey,
      whatsapp_api_key: whatsappApiKey
    };
    
    let error;
    if (existingData) {
      const { error: updateError } = await supabase
        .from('global_settings')
        .update(updateData)
        .eq('id', existingData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('global_settings')
        .insert([updateData]);
      error = insertError;
    }

    setSaving(false);
    if (error) {
      console.error(error);
      setMessage('Error saving. Did you run the SQL script to add the new API key columns?');
    } else {
      setMessage('Successfully saved all settings & API keys!');
    }
  };

  if (loading) return <div style={{padding: '2rem', fontFamily: 'sans-serif'}}>Loading Super Admin...</div>;

  return (
    <div style={{ padding: '3rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#0f172a', color: 'white', padding: '1.5rem', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{fontSize: '22px', fontWeight: 'bold', margin: 0}}>Super Admin Vault</h1>
        <p style={{margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '14px'}}>Securely manage global settings and automation API keys.</p>
      </div>
      
      <div style={{ background: 'white', padding: '2rem', borderRadius: '0 0 12px 12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        
        {message && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', background: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#991b1b' : '#166534', borderRadius: '8px', borderLeft: message.includes('Error') ? '4px solid #ef4444' : '4px solid #22c55e', fontWeight: '500' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
          
          {/* General Section */}
          <div>
            <h2 style={{fontSize: '18px', fontWeight: '700', marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem'}}>General Support</h2>
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569'}}>
                Official WhatsApp Support Number
              </label>
              <input 
                type="text" 
                placeholder="e.g. +919876543210" 
                value={whatsappNumber} 
                onChange={e => setWhatsappNumber(e.target.value)} 
                style={{width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px'}} 
              />
              <p style={{fontSize: '13px', color: '#64748b', marginTop: '6px'}}>
                This number is used by clinics when they request help from their dashboard. Include country code.
              </p>
            </div>
          </div>

          {/* API Keys Section */}
          <div>
            <h2 style={{fontSize: '18px', fontWeight: '700', marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem'}}>Automation API Keys</h2>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              {/* Anthropic API Key */}
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569'}}>
                  Anthropic (Claude Haiku) API Key
                </label>
                <input 
                  type="password" 
                  placeholder="sk-ant-api03-..." 
                  value={anthropicApiKey} 
                  onChange={e => setAnthropicApiKey(e.target.value)} 
                  style={{width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', fontFamily: 'monospace'}} 
                />
                <p style={{fontSize: '13px', color: '#64748b', marginTop: '6px'}}>
                  The brain of the automation. Used for instant queue processing and smart replies.
                </p>
              </div>

              {/* Voice API Key */}
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569'}}>
                  Voice Provider API Key (Exotel/Vapi/etc)
                </label>
                <input 
                  type="password" 
                  placeholder="Paste your voice provider API key here" 
                  value={voiceApiKey} 
                  onChange={e => setVoiceApiKey(e.target.value)} 
                  style={{width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', fontFamily: 'monospace'}} 
                />
                <p style={{fontSize: '13px', color: '#64748b', marginTop: '6px'}}>
                  Used to handle incoming and outgoing AI phone calls with patients.
                </p>
              </div>

              {/* WhatsApp API Key */}
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569'}}>
                  WhatsApp API Key
                </label>
                <input 
                  type="password" 
                  placeholder="Paste your WhatsApp API token here" 
                  value={whatsappApiKey} 
                  onChange={e => setWhatsappApiKey(e.target.value)} 
                  style={{width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', fontFamily: 'monospace'}} 
                />
                <p style={{fontSize: '13px', color: '#64748b', marginTop: '6px'}}>
                  Used for sending automated queue token alerts and replies to patients on WhatsApp.
                </p>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={saving} 
            style={{padding: '14px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px', marginTop: '1rem', transition: 'background 0.2s'}}
            onMouseOver={(e) => e.target.style.background = '#2563eb'}
            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
          >
            {saving ? 'Encrypting & Saving...' : 'Save Vault Data'}
          </button>
        </form>
      </div>
    </div>
  );
}
