'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { getDueScheduledChange, buildApplyScheduled } from '@/lib/role-manager';

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
      const res = await fetch('/api/user-data?type=profile', { cache: 'no-store' });
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
    if (pathname === '/onboarding' || pathname.startsWith('/auth')) return;
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

  // Lazily apply a scheduled role change once its effective date arrives — no
  // cron needed; it happens the next time the user loads the app.
  const scheduledAppliedRef = useRef(false);
  useEffect(() => {
    if (!profile || scheduledAppliedRef.current) return;
    const due = getDueScheduledChange(profile);
    if (!due) return;
    scheduledAppliedRef.current = true;
    updateProfile(buildApplyScheduled(profile, profile.id, due)).catch(() => {});
  }, [profile, updateProfile]);

  // Lazily migrate the legacy single `preferred_tool` to the `preferred_tools`
  // array so older profiles aren't stuck on a tool they can't manage. Runs once,
  // the next time the user loads the app (same approach as scheduled changes).
  const toolMigratedRef = useRef(false);
  useEffect(() => {
    if (!profile || toolMigratedRef.current) return;
    const hasArray = Array.isArray(profile.preferred_tools) && profile.preferred_tools.length > 0;
    const legacy = profile.preferred_tool;
    const hasLegacy = legacy !== undefined && legacy !== null && legacy !== '';
    if (hasArray || !hasLegacy) return;
    toolMigratedRef.current = true;
    // `preferred_tool` is already stored in serialized form (an id string or a
    // custom-tool object), so it drops straight into the array.
    updateProfile({ preferred_tools: [legacy], preferred_tool: null }).catch(() => {});
  }, [profile, updateProfile]);

  const value = { profile, isLoading, updateProfile, refreshProfile, session };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
