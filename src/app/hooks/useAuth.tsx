import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

import { UserSubscription, subscriptionsService } from '../services/subscriptionsService';

export type UserRole = 'Admin' | 'Manager' | 'Field Agent' | 'Super Admin';

interface Profile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  phone: string;
  admin_id: string;
  parent_id?: string;
  status: 'Active' | 'Inactive';
  subscription?: UserSubscription | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rename component for clear export
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchingRef = React.useRef<string | null>(null);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    // Prevent duplicate parallel fetches for the same ID
    if (fetchingRef.current === userId && retryCount === 0) return;
    fetchingRef.current = userId;

    try {
      console.log(`[useAuth] Fetching profile (attempt ${retryCount + 1}) for:`, userId);
      
      // Add a safety timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      const { data, error }: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('[useAuth] Profile DB error:', error);
      } else if (data && data.length > 0) {
        const profileData = data[0];
        console.log('[useAuth] Profile found:', profileData.full_name);
        
        // Load subscription in background
        subscriptionsService.getUserSubscription(userId).then(sub => {
          setProfile(prev => prev ? { ...prev, subscription: sub } : null);
        }).catch(err => console.warn('[useAuth] Sub load failed:', err));

        setProfile(profileData);
      } else {
        console.log('[useAuth] No profile record found for this user.');
        setProfile(null);
      }
    } catch (err: any) {
      console.error('[useAuth] Uncaught profile fetch error:', err);
      
      // Retry once if it was a timeout
      if (err.message === 'Profile fetch timeout' && retryCount < 1) {
        console.log('[useAuth] Retrying profile fetch...');
        fetchingRef.current = null; // Reset ref to allow retry
        return fetchProfile(userId, retryCount + 1);
      }
    } finally {
      if (retryCount === 0 || fetchingRef.current === userId) {
        setLoading(false);
        fetchingRef.current = null;
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    // 2. State change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log('[useAuth] Auth Event:', event);
      
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        // If profile is already loaded for this user, don't set loading to true
        if (!profile || profile.id !== currentUser.id) {
          setLoading(true);
          fetchProfile(currentUser.id);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook export at bottom
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Returns the admin_id that should be used to scope all data queries.
 * - Super Admins → 'SUPER_ADMIN' (bypasses admin checks)
 * - Admins  → their own id (they ARE the admin)
 * - Agents  → their admin_id (they belong to an admin)
 */
export function getEffectiveAdminId(profile: Profile | null): string | null {
  if (!profile) return null;
  if (profile.role === 'Super Admin') return 'SUPER_ADMIN';
  // In the pyramid model, everyone uses their own ID for data scoping
  // RLS will handle recursive visibility upwards.
  return profile.id;
}
