import { createContext, useContext, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ANON_PROFILE: Profile = {
  id: 'anon',
  daily_budget_kg: 15.0,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }

  async function refreshProfile() {
    await loadProfile();
  }

  if (loading) {
    loadProfile();
  }

  return (
    <AuthContext.Provider value={{ profile: profile || ANON_PROFILE, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
