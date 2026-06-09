'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

const ProfileContext = createContext(null);

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = useCallback(async () => {
    if (status === 'loading') return;

    try {
      const res = await fetch('/api/user-data?type=profile');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setProfile(data);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // fetch failed — fall through to null profile
    }

    setProfile(null);
    setIsLoading(false);
    if (pathname !== '/onboarding' && !pathname.startsWith('/auth') && !pathname.startsWith('/tour')) {
      router.push('/onboarding');
    }
  }, [status, pathname, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (fields) => {
    const updated = { ...profile, ...fields };
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', data: updated }),
      });
      setProfile(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }, [profile]);

  const value = { profile, isLoading, updateProfile, refreshProfile: fetchProfile, session };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
