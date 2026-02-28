import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { supabase } from '../lib/supabase';
import { Coffee, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isRegistered = new URLSearchParams(location.search).get('registered') === 'true';

  // If already logged in, redirect home immediately
  useEffect(() => {
    if (user && !isRegistered) {
      console.log('[Login] User already exists, bumping to home...');
      navigate('/', { replace: true });
    }
  }, [user, navigate, isRegistered]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(true);
    setError(null);

    try {
      console.log('[Login] Form submitted:', email);
      
      const timeoutId = setTimeout(() => {
        console.warn('[Login] Sign in is taking a long time (10s+)...');
        setError('Connection is slow. Please wait or check your internet.');
      }, 10000);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('[Login] Supabase sign in error:', error);
        setError(error.message);
        setStatus(false);
      } else {
        console.log('[Login] Sign in success, User ID:', data.user?.id);
        console.log('[Login] Redirecting home...');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error('[Login] Unexpected runtime crash:', err);
      setError('A system error occurred. Check browser console.');
      setStatus(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#14532D] text-white mb-4 shadow-lg shadow-green-900/20">
            <Coffee size={32} />
          </div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 800, color: '#111827' }}>
            CoffeeTrack
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Management System Login
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#991B1B' }}>
                {error}
              </p>
            </div>
          )}

          {isRegistered && !error && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#166534' }}>
                Account created successfully! Please sign in to continue.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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

            <div>
              <label className="block mb-1.5" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#14532D] text-white rounded-xl font-semibold text-[14px] hover:opacity-95 transition-all shadow-md shadow-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B7280' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#14532D] font-bold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-8" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#9CA3AF' }}>
          &copy; 2026 Coffee Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
