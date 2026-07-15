/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Wallet, MessageCircle, PhoneCall, Save, AlertTriangle, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function BillingPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_settings').select('*').limit(1).single();
    
    if (!data) {
      // Initialize if empty
      const { data: newData } = await supabase.from('platform_settings').insert([{}]).select().single();
      setSettings(newData);
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setSaving(true);
    const { error } = await supabase.from('platform_settings')
      .update({
        super_admin_phone: settings.super_admin_phone,
        alert_threshold: settings.alert_threshold,
      })
      .eq('id', settings.id);
      
    setSaving(false);
    if (error) {
      alert("Error saving settings: " + error.message);
    } else {
      alert("Alert settings saved successfully.");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Master Wallet data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-500" />
            Master Wallet & API Tokens
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor your global platform usage and manage low-balance alerts.
          </p>
        </div>
        <button onClick={fetchSettings} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Balances Overview */}
      <div className="grid grid-cols-1 gap-6">
        <div className={`glass-panel p-6 rounded-2xl border ${settings?.master_telecmi_balance < settings?.alert_threshold ? 'border-rose-300 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/5' : 'border-slate-200/50 dark:border-slate-800/50'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            {settings?.master_telecmi_balance < settings?.alert_threshold && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 dark:bg-rose-500/20 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                LOW BALANCE
              </span>
            )}
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">TeleCMI Credits Remaining</h3>
          <div className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {settings?.master_telecmi_balance?.toLocaleString() || '0'}
          </div>
          <p className="text-sm mt-2 text-slate-500">Unified credits remaining for TeleCMI Voice and Messaging API.</p>
        </div>
      </div>

      {/* Alert Configuration Form */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <h2 className="text-lg font-bold mb-1">Automated Refill Alerts</h2>
        <p className="text-sm text-slate-500 mb-6">Configure where the system should send low-balance warning messages.</p>
        
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Super Admin Phone Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500">
                +
              </span>
              <input 
                type="text" 
                required
                value={settings?.super_admin_phone || ''}
                onChange={e => setSettings({...settings, super_admin_phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-r-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500" 
                placeholder="919876543210" 
              />
            </div>
            <p className="text-xs text-slate-500">Include country code (e.g., 91 for India). No spaces or + signs.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Low Balance Alert Threshold</label>
            <input 
              type="number" 
              required
              min="0"
              value={settings?.alert_threshold || 1000}
              onChange={e => setSettings({...settings, alert_threshold: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500" 
            />
            <p className="text-xs text-slate-500">When either token balance falls below this number, you will receive an automated WhatsApp/SMS warning.</p>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Alert Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
