/* eslint-disable */
'use client';

import { Bot, Lock, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Background Ornaments */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute -top-[500px] -right-[500px] w-[1000px] h-[1000px] rounded-full bg-teal-500/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-[500px] -left-[500px] w-[1000px] h-[1000px] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 px-4 sm:px-0 animate-in fade-in zoom-in-95 duration-700">
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-blue-500"></div>
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg mb-6">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              BruvoLabs Platform
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in to the Super Admin Dashboard
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Team Member
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Bot className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select your name...</option>
                  <option value="admin1@queuecare.local">Admin 1</option>
                  <option value="admin2@queuecare.local">Admin 2</option>
                  <option value="admin3@queuecare.local">Admin 3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in (or create password)"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
