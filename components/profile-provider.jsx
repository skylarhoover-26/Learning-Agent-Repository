'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const hasRedirected = useRef(false);
  const hasFetched = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (status === 'loading') return;

    try {
      const res = await fetch('/api/user-data?type=profile');
      if (res.ok) {
        const json = await res.json();
        let profileData = json.data;
        if (profileData && profileData.data && profileData.data.department) {
          profileData = profileData.data;
        }
        if (profileData && profileData.department) {
          setProfile(profileData);
          setIsLoading(false);
          hasFetched.current = true;
          return;
        }
      }
    } catch {
      if (hasFetched.current) return;
    }

    setProfile(null);
    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (isLoading || profile) return;
    if (hasRedirected.current) return;
    if (pathname === '/onboarding' || pathname.startsWith('/auth') || pathname.startsWith('/tour')) return;
    hasRedirected.current = true;
    router.push('/onboarding');
  }, [isLoading, profile, pathname, router]);

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

  const refreshProfile = useCallback(async () => {
    hasFetched.current = false;
    hasRedirected.current = false;
    await fetchProfile();
  }, [fetchProfile]);

  const value = { profile, isLoading, updateProfile, refreshProfile, session };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
