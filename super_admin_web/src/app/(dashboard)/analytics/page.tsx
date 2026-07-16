"use client";

import { useState, useEffect } from "react";
import { Activity, Users, Building2, TrendingUp, CalendarDays, Smartphone, Monitor, UserCheck, PhoneCall } from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-6 bg-red-50 rounded-xl border border-red-200">Error loading analytics: {error}</div>;
  }

  // Calculate percentages for registration methods
  const methods = data?.methodsCount || { 'walk-in': 0, kiosk: 0, ivr: 0, whatsapp: 0 };
  const totalMethods = Object.values(methods).reduce((a: any, b: any) => a + b, 0) as number;

  const getPercent = (count: number) => {
    if (totalMethods === 0) return 0;
    return Math.round((count / totalMethods) * 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Global metrics and performance data across all registered clinics.
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-indigo-50 dark:text-indigo-900/20 group-hover:scale-110 transition-transform duration-500">
            <Users className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Total Patients (All-Time)</h3>
            </div>
            <div className="text-5xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
              {data?.totalPatients?.toLocaleString() || 0}
            </div>
            <p className="text-sm mt-2 text-slate-500 font-medium">Patients served since platform launch.</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-emerald-50 dark:text-emerald-900/20 group-hover:scale-110 transition-transform duration-500">
            <CalendarDays className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
              <Activity className="w-5 h-5" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Today's Traffic</h3>
            </div>
            <div className="text-5xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
              {data?.todayPatients?.toLocaleString() || 0}
            </div>
            <p className="text-sm mt-2 text-slate-500 font-medium">Patients checked-in globally today.</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-purple-50 dark:text-purple-900/20 group-hover:scale-110 transition-transform duration-500">
            <Building2 className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
              <Building2 className="w-5 h-5" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Active Clinics</h3>
            </div>
            <div className="text-5xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
              {data?.totalClinics?.toLocaleString() || 0}
            </div>
            <p className="text-sm mt-2 text-slate-500 font-medium">Clinics operating on QueueCare.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Clinic Leaderboard */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <h2 className="text-lg font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Top Clinics by Volume (All-Time)
          </h2>
          <div className="space-y-4">
            {data?.leaderboard?.map((clinic: any, index: number) => (
              <div key={clinic.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                    #{index + 1}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{clinic.name}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  {clinic.patient_count.toLocaleString()} <span className="text-xs text-slate-400">pts</span>
                </div>
              </div>
            ))}
            {(!data?.leaderboard || data.leaderboard.length === 0) && (
              <div className="text-center py-8 text-slate-500">No clinics data available.</div>
            )}
          </div>
        </div>

        {/* Registration Methods */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <h2 className="text-lg font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-500" />
            Registration Origins
          </h2>
          <p className="text-sm text-slate-500 mb-6">How patients are being added to the queue across the platform.</p>
          
          <div className="space-y-6">
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400"><Monitor className="w-4 h-4"/> Self-Serve Kiosk</span>
                <span className="text-slate-600 dark:text-slate-400">{getPercent(methods['kiosk'])}% ({methods['kiosk']})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div className="bg-indigo-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(methods['kiosk'])}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><UserCheck className="w-4 h-4"/> Reception (Walk-In)</span>
                <span className="text-slate-600 dark:text-slate-400">{getPercent(methods['walk-in'])}% ({methods['walk-in']})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(methods['walk-in'])}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="flex items-center gap-2 text-rose-700 dark:text-rose-400"><PhoneCall className="w-4 h-4"/> AI Voice IVR</span>
                <span className="text-slate-600 dark:text-slate-400">{getPercent(methods['ivr'])}% ({methods['ivr']})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div className="bg-rose-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(methods['ivr'])}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="flex items-center gap-2 text-teal-700 dark:text-teal-400"><Smartphone className="w-4 h-4"/> WhatsApp Bot</span>
                <span className="text-slate-600 dark:text-slate-400">{getPercent(methods['whatsapp'])}% ({methods['whatsapp']})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div className="bg-teal-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(methods['whatsapp'])}%` }}></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
