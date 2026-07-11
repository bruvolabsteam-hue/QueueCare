/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, XCircle, Trash2, ExternalLink, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Clinic Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClinic, setNewClinic] = useState({ name: '', email: '', phone: '' });
  const [isAdding, setIsAdding] = useState(false);

  // Edit Settings Modal State
  const [editModalData, setEditModalData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    setLoading(true);
    const { data } = await supabase.from('clinics').select('*').order('created_at', { ascending: false });
    setClinics(data || []);
    setLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('clinics').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      setClinics(clinics.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    } else {
      alert("Error updating status: " + error.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely remove ${name}? This cannot be undone.`)) return;
    
    const { error } = await supabase.from('clinics').delete().eq('id', id);
    if (!error) {
      setClinics(clinics.filter(c => c.id !== id));
    } else {
      alert("Error deleting clinic: " + error.message);
    }
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinic.name || !newClinic.email) return;
    
    setIsAdding(true);
    const slug = newClinic.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") + "-" + Math.random().toString(36).substring(2, 8);

    const { error } = await supabase.from('clinics').insert([
      { 
        clinic_name: newClinic.name, 
        owner_email: newClinic.email, 
        clinic_slug: slug 
      }
    ]);
    
    setIsAdding(false);
    
    if (error) {
      alert("Failed to add clinic: " + error.message);
    } else {
      setIsAddModalOpen(false);
      setNewClinic({ name: '', email: '', phone: '' });
      fetchClinics();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalData) return;
    
    setIsEditing(true);
    const { error } = await supabase.from('clinics').update({
      whatsapp_sender_number: editModalData.whatsapp_sender_number,
      exotel_caller_id: editModalData.exotel_caller_id
    }).eq('id', editModalData.id);
    
    setIsEditing(false);
    
    if (error) {
      alert("Failed to update settings: " + error.message);
    } else {
      setEditModalData(null);
      fetchClinics();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clinics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage all registered clinics, their statuses, and settings on the platform.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white rounded-xl font-medium shadow-sm transition-all hover:shadow-md transform hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Add New Clinic
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Clinic Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading clinics...</td>
                </tr>
              ) : clinics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No clinics found. Create one to get started.</td>
                </tr>
              ) : (
                clinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{clinic.clinic_name}</div>
                      <div className="text-xs text-slate-500">{clinic.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 dark:text-slate-300">{clinic.owner_email}</div>
                      <div className="text-slate-500 text-xs">{clinic.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(clinic.id, clinic.is_active)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          clinic.is_active 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" 
                            : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400"
                        }`}
                      >
                        {clinic.is_active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {clinic.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditModalData(clinic)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20" title="Sender Settings">
                          <Settings className="h-3.5 w-3.5" />
                          Settings
                        </button>
                        <a href={`http://localhost:3000?clinic_id=${clinic.id}`} target="_blank" className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20" title="Impersonate Clinic">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Impersonate
                        </a>
                        <button onClick={() => handleDelete(clinic.id, clinic.clinic_name)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" title="Remove Clinic">
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel bg-white/90 dark:bg-slate-900/90 rounded-2xl max-w-md w-full p-6 shadow-2xl zoom-in-95 animate-in">
            <h3 className="text-xl font-bold mb-4">Add New Clinic</h3>
            <form onSubmit={handleAddClinic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Clinic Name</label>
                <input required type="text" value={newClinic.name} onChange={e => setNewClinic({...newClinic, name: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" placeholder="OmniCare Central" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input required type="email" value={newClinic.email} onChange={e => setNewClinic({...newClinic, email: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" placeholder="contact@omnicare.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" value={newClinic.phone} onChange={e => setNewClinic({...newClinic, phone: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" placeholder="+1234567890" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={isAdding} className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl hover:from-teal-600 hover:to-blue-600 transition-colors disabled:opacity-50">
                  {isAdding ? "Adding..." : "Create Clinic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel bg-white/90 dark:bg-slate-900/90 rounded-2xl max-w-md w-full p-6 shadow-2xl zoom-in-95 animate-in">
            <h3 className="text-xl font-bold mb-4">Edit Master Sender Numbers</h3>
            <p className="text-sm text-slate-500 mb-4">Configure the sender numbers that will be used via the Super Admin API keys for {editModalData.clinic_name}.</p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Sender Number</label>
                <input type="text" value={editModalData.whatsapp_sender_number || ''} onChange={e => setEditModalData({...editModalData, whatsapp_sender_number: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500" placeholder="+919876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Exotel Caller ID</label>
                <input type="text" value={editModalData.exotel_caller_id || ''} onChange={e => setEditModalData({...editModalData, exotel_caller_id: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500" placeholder="08047112345" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditModalData(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={isEditing} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-colors disabled:opacity-50">
                  {isEditing ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
