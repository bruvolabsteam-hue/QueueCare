/* eslint-disable */
'use client';

import { Users, Building2, PhoneCall, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalClinics: number;
  activePatients: number;
  noShowRate: string;
  masterWalletTelecmi: number;
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClinics: 0,
    activePatients: 0,
    noShowRate: "0%",
    masterWalletTelecmi: 0
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user && user.is_superuser) {
      const fetchStats = async () => {
        try {
          // Total Clinics
          const { count: clinicsCount } = await supabase
            .from('clinics')
            .select('*', { count: 'exact', head: true });
            
          // Active Patients today
          const startOfDay = new Date().toISOString().split('T')[0];
          const { count: patientsCount } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay);

          // No-Show Rate (all time or recent)
          const { count: totalAppointments } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true });
            
          const { count: noShows } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('is_no_show', true);
            
          let noShowPercent = 0;
          if (totalAppointments && totalAppointments > 0) {
            noShowPercent = Math.round((noShows! / totalAppointments) * 100);
          }
          
          // Master Wallet
          const { data: platformData } = await supabase.from('platform_settings').select('*').limit(1).single();

          setStats({
            totalClinics: clinicsCount || 0,
            activePatients: patientsCount || 0,
            noShowRate: `${noShowPercent}%`,
            masterWalletTelecmi: platformData?.master_telecmi_balance || 0
          });
        } catch (error) {
          console.error("Failed to fetch dashboard stats", error);
        } finally {
          setDataLoading(false);
        }
      };
      fetchStats();
    } else if (user) {
      setDataLoading(false);
    }
  }, [user]);

  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const statCards = [
    { name: 'Total Clinics', value: stats.totalClinics.toString(), change: '+10.5%', icon: Building2 },
    { name: 'Active Patients (Today)', value: stats.activePatients.toLocaleString(), change: '+14.2%', icon: Users },
    { name: 'Avg No-Show Rate', value: stats.noShowRate, change: '-5.2%', icon: AlertCircle, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Overview</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Welcome back, {user?.email || 'Super Admin'}. Here is what is happening across your clinics today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((item) => (
          <div
            key={item.name}
            className="glass-panel overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-teal-100 dark:bg-teal-500/20 rounded-xl">
                  <item.icon className="h-6 w-6 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{item.name}</dt>
                  <dd>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{item.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm">
                <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">{item.change}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="glass-panel rounded-2xl p-6 h-96 flex flex-col justify-between">
          <h2 className="text-lg font-semibold">Platform Master Wallet (Overage System)</h2>
          <div className="flex-1 flex flex-col justify-center gap-4">
             <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
                <h3 className="text-sm font-medium text-teal-600 dark:text-teal-400">TeleCMI Credits Remaining</h3>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.masterWalletTelecmi.toLocaleString()}</div>
             </div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Sales Pitch Metrics</h2>
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-xl border border-blue-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Reduce No-Shows by 40%</h3>
              <p className="text-slate-600 dark:text-slate-300">
                The average clinic using BruvoLabs sees a <strong className="text-indigo-600 dark:text-indigo-400">40% reduction</strong> in no-shows within the first month.
              </p>
              <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-slate-600/50">
                 <span className="text-sm font-medium text-slate-500">Current Platform No-Show Rate:</span>
                 <span className="ml-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.noShowRate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
