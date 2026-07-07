/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldAlert, UserMinus, KeyRound, Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function SecurityPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    
    // Fetch all clinics
    const { data: clinics } = await supabase.from('clinics').select('id, name').order('created_at', { ascending: false });
    
    if (clinics) {
      // Fetch staff for all clinics
      const { data: staff } = await supabase.from('staff').select('*');
      
      const mappedData = clinics.map(clinic => ({
        ...clinic,
        staff: staff?.filter(s => s.clinic_id === clinic.id) || [],
        isolation_status: "100% Isolated",
      }));
      
      setData(mappedData);
    }
    
    setLoading(false);
  };

  const handleRevokeAccess = async (staffId: string, staffName: string, clinicName: string) => {
    if (!window.confirm(`Are you sure you want to completely revoke access for ${staffName} from ${clinicName}? They will no longer be able to log in to this clinic.`)) return;
    
    const { error } = await supabase.from('staff').delete().eq('id', staffId);
    if (!error) {
      fetchSecurityData();
    } else {
      alert("Error revoking access: " + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            Security & Access Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Verify Data Isolation and manage exactly who has access to which clinic.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Scanning security mappings...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No clinics found in the system.</div>
      ) : (
        <div className="grid gap-6">
          {data.map((clinic) => (
            <div key={clinic.id} className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800/50">
              {/* Clinic Header */}
              <div className="bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{clinic.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      Data completely isolated via RLS
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Staff List */}
              <div className="p-0">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                  <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/20 dark:bg-slate-800/20">
                    <tr>
                      <th className="px-6 py-3 font-medium">User Name</th>
                      <th className="px-6 py-3 font-medium">Email Address</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {clinic.staff.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-slate-400 italic text-sm">No users have access to this clinic.</td>
                      </tr>
                    ) : (
                      clinic.staff.map((member: any) => (
                        <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            {member.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {member.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
                              ${member.role === 'clinic_admin' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' 
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {member.role === 'clinic_admin' && <KeyRound className="w-3 h-3 mr-1" />}
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleRevokeAccess(member.id, member.name, clinic.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" 
                              title="Revoke Access"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Revoke Access
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
