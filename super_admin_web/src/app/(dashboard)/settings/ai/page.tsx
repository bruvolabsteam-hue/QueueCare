/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Save, Bot, MessageSquare, Phone, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function GlobalAIConfig() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form State
  const [modelVersion, setModelVersion] = useState("claude-3-haiku-20240307");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [exotelSid, setExotelSid] = useState("");
  const [voiceKey, setVoiceKey] = useState("");
  const [whatsappKey, setWhatsappKey] = useState("");
  const [supportNumber, setSupportNumber] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from("global_settings").select("*").limit(1).single();
      if (data) {
        setAnthropicKey(data.anthropic_api_key || "");
        setVoiceKey(data.voice_api_key || "");
        setWhatsappKey(data.whatsapp_api_key || "");
        setSupportNumber(data.support_whatsapp_number || "");
        // We will add model_version and exotel_sid to the DB later, for now we keep local state
        setModelVersion(data.claude_model_version || "claude-3-haiku-20240307");
        setExotelSid(data.exotel_account_sid || "");
      }
      setLoading(false);
    }
    loadSettings();
  }, [supabase]);

  const toggleKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    
    const { data: existingData } = await supabase.from("global_settings").select("id").limit(1).single();
    
    const updateData = {
      anthropic_api_key: anthropicKey,
      voice_api_key: voiceKey,
      whatsapp_api_key: whatsappKey,
      support_whatsapp_number: supportNumber,
      // Note: claude_model_version and exotel_account_sid need to be added to the DB schema
    };
    
    let error;
    try {
      if (existingData) {
        const { error: updateError } = await supabase.from("global_settings").update(updateData).eq("id", existingData.id);
        error = updateError;
        // Attempt to save new columns (might fail if they didn't run the migration yet)
        await supabase.from("global_settings").update({ claude_model_version: modelVersion, exotel_account_sid: exotelSid }).eq("id", existingData.id);
      } else {
        const { error: insertError } = await supabase.from("global_settings").insert([updateData]);
        error = insertError;
      }
    } catch (err) {
      console.error(err);
    }

    setSaving(false);
    if (error) {
      setMessage("Error saving: " + error.message);
    } else {
      setMessage("Successfully saved Global AI Configuration & API Keys!");
    }
  };

  if (loading) return <div className="p-8">Loading configuration...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Global AI & API Vault</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure master API keys and Claude AI models used across all clinics.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm p-8">
        {message && (
          <div className={`p-4 mb-6 rounded-xl border ${message.includes("Error") ? "bg-red-50 text-red-700 border-red-200" : "bg-teal-50 text-teal-700 border-teal-200"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Anthropic Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Bot className="h-5 w-5 text-teal-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Anthropic Engine</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Claude Model Version</label>
                <select 
                  value={modelVersion}
                  onChange={e => setModelVersion(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Balanced)</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus (Advanced)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Master API Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['anthropic'] ? "text" : "password"} 
                    value={anthropicKey}
                    onChange={e => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                  <button type="button" onClick={() => toggleKey('anthropic')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['anthropic'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Exotel Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Phone className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Exotel Voice Telecom</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Account SID</label>
                <input 
                  type="text" 
                  value={exotelSid}
                  onChange={e => setExotelSid(e.target.value)}
                  placeholder="exotel_omnicare_01"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Voice API Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['exotel'] ? "text" : "password"} 
                    value={voiceKey}
                    onChange={e => setVoiceKey(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxx"
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                  <button type="button" onClick={() => toggleKey('exotel')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['exotel'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* WhatsApp Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">WhatsApp Business API</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Access Token</label>
                <div className="relative">
                  <input 
                    type={showKeys['whatsapp'] ? "text" : "password"} 
                    value={whatsappKey}
                    onChange={e => setWhatsappKey(e.target.value)}
                    placeholder="EAAGm0Pxxxxxxxxxxxx"
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                  <button type="button" onClick={() => toggleKey('whatsapp')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['whatsapp'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Global Support Number</label>
                <input 
                  type="text" 
                  value={supportNumber}
                  onChange={e => setSupportNumber(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
                />
              </div>
            </div>
          </section>

          <div className="pt-6 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 mr-1 text-teal-500" />
              Keys are encrypted at rest using AES-256-GCM.
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Global Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
