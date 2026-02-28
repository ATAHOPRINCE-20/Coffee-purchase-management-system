import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
        {title}
      </h2>
      
      <p className="mt-2 max-w-md" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B7280' }}>
        {message}
      </p>

      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100 w-full max-w-md">
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="mb-2">
          Troubleshooting Tips:
        </p>
        <ul className="text-left space-y-1.5" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B7280' }}>
          <li>• Check your internet connection</li>
          <li>• Ensure you've run the database schema SQL</li>
          <li>• Verify your Supabase credentials in .env</li>
        </ul>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-8 flex items-center gap-2 px-6 py-2.5 bg-[#14532D] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-green-900/10"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
