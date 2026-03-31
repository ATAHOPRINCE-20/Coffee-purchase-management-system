import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../lib/supabase';
import { Coffee, Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <img src="/icon.png" alt="CoffeeTrack Logo" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 800, color: '#111827' }}>
            Account Recovery
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#991B1B' }}>
                {error}
              </p>
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#166534' }}>
                  A password reset link has been sent to <strong>{email}</strong>. Please check your inbox.
                </p>
              </div>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-[14px] hover:bg-gray-50 transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block mb-1.5" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all"
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#14532D] text-white rounded-xl font-semibold text-[14px] hover:opacity-95 transition-all shadow-md shadow-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending Link...
                  </>
                ) : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-[#14532D] font-bold hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-center mt-8" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#9CA3AF' }}>
          &copy; 2026 Coffee Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
