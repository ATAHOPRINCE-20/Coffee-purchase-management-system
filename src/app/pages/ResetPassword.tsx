import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '../lib/supabase';
import { Lock, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
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
            Setup New Password
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Choose a strong password for your account
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
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Password Updated!</h3>
                <p className="text-sm text-gray-500">
                  Your password has been changed successfully. Redirecting to login...
                </p>
              </div>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#14532D] text-white rounded-xl font-semibold text-[14px] hover:opacity-95 transition-all"
              >
                Go to Login
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                    />
                  </div>
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
                    Updating Password...
                  </>
                ) : 'Reset Password'}
              </button>
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
