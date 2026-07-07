'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  is_superuser: boolean;
  clinic_id: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string, email: string): Promise<User | null> {
  // Use the SECURITY DEFINER RPCs to bypass RLS safely
  const { data: role } = await supabase.rpc('get_user_role');
  const { data: clinicId } = await supabase.rpc('get_user_clinic_id');

  if (role !== 'super_admin') {
    return null; // Not a super admin
  }

  return {
    id: userId,
    email: email,
    is_superuser: true,
    clinic_id: clinicId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      try {
        const profile = await fetchUserProfile(session.user.id, session.user.email || '');

        if (!profile) {
          await supabase.auth.signOut();
          setUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
          setIsLoading(false);
          return;
        }

        setUser(profile);

        if (pathname === '/login') {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth verification failed', error);
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw new Error(error.message);

    // Verify the user is a super_admin using the RPC
    const profile = await fetchUserProfile(data.user.id, data.user.email || '');

    if (!profile) {
      await supabase.auth.signOut();
      throw new Error('Access denied. You are not a Super Admin.');
    }

    setUser(profile);
    router.push('/');
  };

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
