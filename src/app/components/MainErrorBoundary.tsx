import React from "react";
import { useRouteError, useNavigate } from "react-router";
import { AlertTriangle, RefreshCw, Home, ChevronLeft } from "lucide-react";

export default function MainErrorBoundary() {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  console.error("Route Error:", error);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="h-2 bg-red-500" />
        
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>

          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 800, color: '#1E293B' }}>
            Oops! System Error
          </h1>
          
          <p className="mt-3 text-slate-500 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}>
            Something went wrong while loading this page. This might be due to a temporary connection issue or a system update.
          </p>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Error Details</div>
            <div className="text-xs font-mono text-slate-600 break-all bg-white p-2 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
              {error?.message || error?.statusText || "Unknown system failure"}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#14532D] text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-green-900/10"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                <ChevronLeft size={18} />
                Go Back
              </button>
              
              <button
                onClick={() => navigate("/")}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                <Home size={18} />
                Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium tracking-tight">
            Coffee Management System · v2.0.1-beta
          </p>
        </div>
      </div>
    </div>
  );
}
