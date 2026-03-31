import { useEffect, useState, createContext, useContext } from 'react';
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

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[useAuth] Fetching profile for:', userId);
      // Use a standard select to avoid potential issues with maybeSingle hanging
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

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
      }
    } catch (err) {
      console.error('[useAuth] Uncaught profile fetch error:', err);
    } finally {
      if (userId && !profile) {
        // We have a user but no profile record
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      console.log('[useAuth] Auth Event:', event);
      const currentUser = session?.user ?? null;
      
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        // If login/token refresh happens, we must fetch the profile
        // but only if we don't already have the correct profile
        setLoading(true);
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
