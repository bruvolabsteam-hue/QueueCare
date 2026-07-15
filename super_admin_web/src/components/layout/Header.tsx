"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, Search, CheckCircle2, AlertCircle } from "lucide-react";

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-8 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-50">
      <div className="flex flex-1">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200/50 dark:border-slate-700/50 rounded-xl leading-5 bg-white/50 dark:bg-slate-900/50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all duration-200"
            placeholder="Search clinics, doctors, or ID..."
          />
        </div>
      </div>
      <div className="ml-4 flex items-center gap-4 relative" ref={dropdownRef}>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
          <Bell className="h-5 w-5" />
        </button>

        {showNotifications && (
          <div className="absolute top-12 right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-5">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Notifications</h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-xs text-teal-600 hover:text-teal-700"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">New Clinic Registered</p>
                  <p className="text-xs text-slate-500 mt-1">BruvoLabs Central just signed up for the Pro plan.</p>
                  <p className="text-xs text-slate-400 mt-1">2 mins ago</p>
                </div>
              </div>
              <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">API Quota Warning</p>
                  <p className="text-xs text-slate-500 mt-1">Global Voice API usage has reached 80% for this month.</p>
                  <p className="text-xs text-slate-400 mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                View All Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
