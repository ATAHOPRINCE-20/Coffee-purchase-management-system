import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

const DISCLAIMER_KEY = 'cpms_beta_disclaimer_seen';

export function BetaDisclaimer() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(DISCLAIMER_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-amber-100">
        {/* Header */}
        <div className="p-6 bg-amber-50 flex flex-col items-center text-center gap-4 border-b border-amber-100">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900" style={{ fontFamily: 'Inter, sans-serif' }}>Development Preview</h2>
            <p className="text-sm text-amber-700 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Version 0.1.0</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="mt-1 text-amber-600 flex-shrink-0">
                <ShieldAlert size={20} />
              </div>
              <p className="text-gray-600 text-[14px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                This system is currently in <span className="font-bold text-gray-900">active development</span>. You may encounter bugs, performance issues, or temporary service interruptions.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Important Notice</p>
              <p className="text-[13px] text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                Please report any issues to the administrator immediately. Data entered during this phase is preserved, but regular backups are highly recommended.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-8 py-3.5 px-6 rounded-xl bg-[#14532D] text-white font-bold text-sm hover:bg-[#1a6b35] transition-all shadow-lg shadow-green-900/10 active:scale-[0.98]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            I Understand, Proceed
          </button>
        </div>

        {/* Close Icon (Optional) */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-amber-900/40 hover:bg-amber-900/10 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
