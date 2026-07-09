"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function VaultPage() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [voiceApiKey, setVoiceApiKey] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadGlobalSettings() {
      const { data, error } = await supabase
        .from("global_settings")
        .select("*")
        .limit(1)
        .single();
        
      if (data) {
        setWhatsappNumber(data.support_whatsapp_number || "");
        setAnthropicApiKey(data.anthropic_api_key || "");
        setVoiceApiKey(data.voice_api_key || "");
        setWhatsappApiKey(data.whatsapp_api_key || "");
      }
      setLoading(false);
    }
    loadGlobalSettings();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    
    // Check if row exists
    const { data: existingData } = await supabase.from("global_settings").select("id").limit(1).single();
    
    const updateData = {
      support_whatsapp_number: whatsappNumber,
      anthropic_api_key: anthropicApiKey,
      voice_api_key: voiceApiKey,
      whatsapp_api_key: whatsappApiKey
    };
    
    let error;
    if (existingData) {
      const { error: updateError } = await supabase
        .from("global_settings")
        .update(updateData)
        .eq("id", existingData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("global_settings")
        .insert([updateData]);
      error = insertError;
    }

    setSaving(false);
    if (error) {
      console.error(error);
      setMessage("Error saving. Did you run the SQL script to add the new API key columns?");
    } else {
      setMessage("Successfully saved all settings & API keys!");
    }
  };

  if (loading) return <div className="p-8">Loading Vault...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API Key Vault</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Securely manage global settings and automation API keys.
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl">
        {message && (
          <div className={`p-4 mb-6 rounded-xl border ${message.includes("Error") ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30" : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800/30"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* General Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">General Support</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Official WhatsApp Support Number
              </label>
              <input 
                type="text" 
                placeholder="e.g. +919876543210" 
                value={whatsappNumber} 
                onChange={e => setWhatsappNumber(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                This number is used by clinics when they request help from their dashboard. Include country code.
              </p>
            </div>
          </div>

          {/* API Keys Section */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Automation API Keys</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Anthropic (Claude Haiku) API Key
                </label>
                <input 
                  type="password" 
                  placeholder="sk-ant-api03-..." 
                  value={anthropicApiKey} 
                  onChange={e => setAnthropicApiKey(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-mono"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  The brain of the automation. Used for instant queue processing and smart replies.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Voice Provider API Key (Exotel/Vapi/etc)
                </label>
                <input 
                  type="password" 
                  placeholder="Paste your voice provider API key here" 
                  value={voiceApiKey} 
                  onChange={e => setVoiceApiKey(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-mono"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Used to handle incoming and outgoing AI phone calls with patients.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  WhatsApp API Key
                </label>
                <input 
                  type="password" 
                  placeholder="Paste your WhatsApp API token here" 
                  value={whatsappApiKey} 
                  onChange={e => setWhatsappApiKey(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-mono"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Used for sending automated queue token alerts and replies to patients on WhatsApp.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="submit" 
              disabled={saving} 
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Encrypting & Saving..." : "Save Vault Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
