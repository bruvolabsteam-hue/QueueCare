'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
      <h2 className="text-2xl font-bold text-rose-600">Something went wrong!</h2>
      <div className="p-4 bg-rose-50 text-rose-900 rounded-xl font-mono text-sm max-w-2xl text-left overflow-auto border border-rose-200">
        {error.message || "Unknown error"}
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  );
}
