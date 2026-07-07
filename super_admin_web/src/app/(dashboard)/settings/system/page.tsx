import { Save } from "lucide-react";

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure global platform settings, notifications, and defaults.</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-6 border-b pb-2">General Configuration</h2>
        
        <form className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Platform Name</label>
              <input 
                type="text" 
                defaultValue="QueueCare HQ" 
                className="w-full px-4 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Support Email</label>
              <input 
                type="email" 
                defaultValue="support@queuecare.com" 
                className="w-full px-4 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Timezone Default</label>
            <select className="w-full px-4 py-2 border rounded-xl dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500">
              <option>Asia/Kolkata (IST)</option>
              <option>UTC</option>
              <option>America/New_York (EST)</option>
            </select>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">Features</h3>
            
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-teal-500 focus:ring-teal-500 border-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable AI Voice Agent Globally</span>
            </label>

            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-teal-500 focus:ring-teal-500 border-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Automated WhatsApp Notifications</span>
            </label>
            
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5 rounded text-teal-500 focus:ring-teal-500 border-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Maintenance Mode (Disables all clinic dashboards)</span>
            </label>
          </div>

          <div className="pt-6">
            <button 
              type="button" 
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-medium rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
