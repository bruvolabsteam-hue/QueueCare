/* eslint-disable */
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute -top-[500px] -right-[500px] w-[1000px] h-[1000px] rounded-full bg-teal-500/20 blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-[500px] -left-[500px] w-[1000px] h-[1000px] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>
        
        <Header />
        <main className="flex-1 overflow-y-auto p-8 z-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
