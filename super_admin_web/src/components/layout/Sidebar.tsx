"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Settings, BarChart3, Bot, CreditCard, Ticket, ShieldCheck } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clinics", href: "/clinics", icon: Building2 },
  { name: "Security & Access", href: "/security", icon: ShieldCheck },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Support", href: "/support", icon: Ticket },
  { name: "Global AI & Vault", href: "/settings/ai", icon: Bot },
  { name: "System Settings", href: "/settings/system", icon: Settings },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col glass-panel border-r border-slate-200/50 dark:border-slate-800/50">
      <div className="flex h-16 items-center px-6 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#38B6FF] to-blue-600 flex items-center justify-center shadow-sm">
            <span style={{ fontFamily: 'var(--font-bruvo)' }} className="text-white font-bold text-lg">B</span>
          </div>
          <div className="flex items-baseline select-none">
            <span style={{ fontFamily: 'var(--font-bruvo)', fontWeight: 700 }} className="text-xl tracking-tight text-slate-900 dark:text-white">
              Bruvo
            </span>
            <span style={{ fontFamily: 'var(--font-flow)', fontWeight: 400, color: '#38B6FF' }} className="text-xl tracking-tight">
              Flow
            </span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 tracking-wider uppercase">
              Admin
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="flex-1 space-y-1.5 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`group relative flex items-center px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-[280ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] transform hover:translate-x-[6px] active:scale-[0.97] active:translate-x-[3px] overflow-hidden ${
                  isActive
                    ? "text-[#0284c7] font-semibold bg-gradient-to-r from-[#38B6FF]/15 to-transparent shadow-[0_2px_8px_rgba(56,182,255,0.12)] border-l-4 border-[#38B6FF]"
                    : "text-slate-600 hover:bg-gradient-to-r hover:from-[#38B6FF]/10 hover:to-transparent hover:text-[#0284c7]"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 transition-all duration-[280ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.22] group-hover:rotate-[6deg] ${
                    isActive ? "text-[#38B6FF]" : "text-slate-400 group-hover:text-[#38B6FF]"
                  }`}
                  aria-hidden="true"
                />
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  {item.name}
                </span>
              </a>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">SA</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-white">Super Admin</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">admin@bruvoflow.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
