export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
        <h2 className="text-xl font-semibold mb-4">Usage Across All Clinics</h2>
        <p className="text-slate-600 dark:text-slate-400">
          View aggregate token generation, patient flows, and feature usage data.
        </p>
      </div>
    </div>
  );
}
