/* eslint-disable */
"use client";

import { useState } from "react";
import { Save, Bot, MessageSquare, Phone, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function GlobalAIConfig() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Global AI Configuration</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure master API keys and default AI providers used across all clinics.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm p-8">
        <form className="space-y-8">
          
          {/* OpenAI Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Bot className="h-5 w-5 text-teal-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">OpenAI Engine</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Model Version</label>
                <select className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500">
                  <option>gpt-4o</option>
                  <option>gpt-4-turbo</option>
                  <option>gpt-3.5-turbo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Master API Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['openai'] ? "text" : "password"} 
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
                    defaultValue="sk-proj-xxxxxxxxxxxxxxx"
                  />
                  <button type="button" onClick={() => toggleKey('openai')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['openai'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Exotel Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <Phone className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Exotel Telecom</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Account SID</label>
                <input type="text" className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" defaultValue="exotel_omnicare_01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">API Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['exotel'] ? "text" : "password"} 
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
                    defaultValue="xxxxxxxxxxxxxxx"
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
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Access Token</label>
                <div className="relative">
                  <input 
                    type={showKeys['whatsapp'] ? "text" : "password"} 
                    className="w-full pl-3 pr-10 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
                    defaultValue="EAAGm0Pxxxxxxxxxxxx"
                  />
                  <button type="button" onClick={() => toggleKey('whatsapp')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showKeys['whatsapp'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              type="button"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white rounded-xl font-medium shadow-sm transition-all hover:shadow-md transform hover:-translate-y-0.5"
            >
              <Save className="h-4 w-4" />
              Save Global Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
