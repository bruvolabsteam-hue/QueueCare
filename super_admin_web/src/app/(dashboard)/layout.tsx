/* eslint-disable */
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FCF4E7] dark:bg-[#FCF4E7]">
      {/* Background Layer */}
      <div className="fixed inset-0 bg-[#FCF4E7] dark:bg-[#FCF4E7] -z-10">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#38B6FF]/10 dark:bg-[#38B6FF]/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 mix-blend-multiply pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 mix-blend-multiply pointer-events-none"></div>
      </div>  
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
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
