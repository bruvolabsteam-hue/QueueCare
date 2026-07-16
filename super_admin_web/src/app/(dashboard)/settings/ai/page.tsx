/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Save, Bot, Phone, ShieldCheck, Eye, EyeOff, Volume2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function GlobalAIConfig() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form State
  const [activeProvider, setActiveProvider] = useState("groq");
  
  const [groqUrl, setGroqUrl] = useState("https://api.groq.com/openai/v1");
  const [groqModel, setGroqModel] = useState("llama-3.1-8b-instant");
  const [groqApiKey, setGroqApiKey] = useState("");

  const [claudeUrl, setClaudeUrl] = useState("https://api.anthropic.com/v1/messages");
  const [claudeModel, setClaudeModel] = useState("claude-3-haiku-20240307");
  const [claudeApiKey, setClaudeApiKey] = useState("");

  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("");
  const [telecmiAppId, setTelecmiAppId] = useState("");
  const [telecmiSecretKey, setTelecmiSecretKey] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from("global_settings").select("*").limit(1).single();
      if (data) {
        setActiveProvider(data.active_brain_provider || "groq");
        
        setGroqUrl(data.groq_url || data.brain_url || "https://api.groq.com/openai/v1");
        setGroqModel(data.groq_model || data.brain_model || "llama-3.1-8b-instant");
        setGroqApiKey(data.groq_api_key || data.brain_api_key || "");

        setClaudeUrl(data.claude_url || "https://api.anthropic.com/v1/messages");
        setClaudeModel(data.claude_model || "claude-3-haiku-20240307");
        setClaudeApiKey(data.claude_api_key || "");

        setElevenlabsApiKey(data.elevenlabs_api_key || "");
        setTelecmiAppId(data.telecmi_app_id || "");
        setTelecmiSecretKey(data.telecmi_secret_key || "");
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
    
    // Maintain backwards compatibility with the original columns for old code
    const updateData = {
      active_brain_provider: activeProvider,
      groq_url: groqUrl,
      groq_model: groqModel,
      groq_api_key: groqApiKey,
      claude_url: claudeUrl,
      claude_model: claudeModel,
      claude_api_key: claudeApiKey,
      
      // Sync the old columns to the active provider
      brain_url: activeProvider === 'groq' ? groqUrl : claudeUrl,
      brain_model: activeProvider === 'groq' ? groqModel : claudeModel,
      brain_api_key: activeProvider === 'groq' ? groqApiKey : claudeApiKey,

      elevenlabs_api_key: elevenlabsApiKey,
      telecmi_app_id: telecmiAppId,
      telecmi_secret_key: telecmiSecretKey,
    };
    
    let error;
    try {
      if (existingData) {
        const { error: updateError } = await supabase.from("global_settings").update(updateData).eq("id", existingData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("global_settings").insert([updateData]);
        error = insertError;
      }
    } catch (err: any) {
      console.error(err);
      error = err;
    }

    setSaving(false);
    if (error) {
      setMessage("Error saving: " + (error.message || String(error)));
    } else {
      setMessage("Successfully saved Global AI Configuration & API Keys!");
    }
  };

  if (loading) return <div className="p-8">Loading configuration...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Global AI & API Vault</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure master API keys and AI engine used across all clinics.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm p-8">
        {message && (
          <div className={`p-4 mb-6 rounded-xl border ${message.includes("Error") ? "bg-red-50 text-red-700 border-red-200" : "bg-teal-50 text-teal-700 border-teal-200"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Brain Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Bot className="h-5 w-5 text-teal-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Brain Settings (Provider)</h2>
            </div>
            
            <div className="flex gap-4 mb-4">
              <label className={`flex-1 border p-4 rounded-xl cursor-pointer transition-all ${activeProvider === 'groq' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="provider" value="groq" checked={activeProvider === 'groq'} onChange={() => setActiveProvider('groq')} />
                  <span className="font-semibold">Groq (Llama)</span>
                </div>
                <p className="text-xs text-slate-500 ml-6 mt-1">Fast, low latency inferences for queue updates.</p>
              </label>
              <label className={`flex-1 border p-4 rounded-xl cursor-pointer transition-all ${activeProvider === 'claude' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="provider" value="claude" checked={activeProvider === 'claude'} onChange={() => setActiveProvider('claude')} />
                  <span className="font-semibold">Anthropic (Claude)</span>
                </div>
                <p className="text-xs text-slate-500 ml-6 mt-1">Smarter responses using Claude Haiku.</p>
              </label>
            </div>

            {activeProvider === 'groq' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Groq API URL</label>
                  <input 
                    type="text" 
                    value={groqUrl}
                    onChange={e => setGroqUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Groq Model</label>
                  <input 
                    type="text" 
                    value={groqModel}
                    onChange={e => setGroqModel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Groq API Key</label>
                  <div className="relative">
                    <input 
                      type={showKeys['groqApiKey'] ? "text" : "password"} 
                      value={groqApiKey}
                      onChange={e => setGroqApiKey(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                    />
                    <button type="button" onClick={() => toggleKey('groqApiKey')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                      {showKeys['groqApiKey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeProvider === 'claude' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Claude API URL</label>
                  <input 
                    type="text" 
                    value={claudeUrl}
                    onChange={e => setClaudeUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Claude Model</label>
                  <input 
                    type="text" 
                    value={claudeModel}
                    onChange={e => setClaudeModel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Claude API Key</label>
                  <div className="relative">
                    <input 
                      type={showKeys['claudeApiKey'] ? "text" : "password"} 
                      value={claudeApiKey}
                      onChange={e => setClaudeApiKey(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                    />
                    <button type="button" onClick={() => toggleKey('claudeApiKey')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                      {showKeys['claudeApiKey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ElevenLabs TTS Engine Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Volume2 className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">ElevenLabs TTS Engine</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">ElevenLabs API Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['elevenlabs'] ? "text" : "password"} 
                    value={elevenlabsApiKey}
                    onChange={e => setElevenlabsApiKey(e.target.value)}
                    placeholder="Enter ElevenLabs API Key"
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                  <button type="button" onClick={() => toggleKey('elevenlabs')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['elevenlabs'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* TeleCMI Credentials */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Phone className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">TeleCMI Credentials</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">TeleCMI App ID</label>
                <input 
                  type="text" 
                  value={telecmiAppId}
                  onChange={e => setTelecmiAppId(e.target.value)}
                  placeholder="Enter TeleCMI App ID"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">TeleCMI Secret Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['telecmiSecretKey'] ? "text" : "password"} 
                    value={telecmiSecretKey}
                    onChange={e => setTelecmiSecretKey(e.target.value)}
                    placeholder="Enter TeleCMI Secret Key"
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 font-mono" 
                  />
                  <button type="button" onClick={() => toggleKey('telecmiSecretKey')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['telecmiSecretKey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
