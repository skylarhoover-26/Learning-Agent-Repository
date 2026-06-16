'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useProfile } from './profile-provider';
import { resolveTool, normalizeTool } from '@/lib/ai-tools';

// Holds the AI tool the learner is currently working in. The saved preference
// lives on the profile; a per-session override (set from the "open your tool"
// callout's switcher) wins for the current session without changing the saved
// default. Pages read `tool` and pass it to the generation APIs so the coach
// tailors its guidance; the callout reads it to show the right "open" button.

const ActiveToolContext = createContext(null);

export function useActiveTool() {
  const ctx = useContext(ActiveToolContext);
  if (ctx) return ctx;
  // Safe fallback if used outside the provider (e.g. in isolation).
  return {
    tool: resolveTool(null),
    isOverridden: false,
    hasPreference: false,
    setOverride: () => {},
    saveAsDefault: () => {},
  };
}

export function ActiveToolProvider({ children }) {
  const { profile, updateProfile } = useProfile() || {};
  const [override, setOverrideState] = useState(null);

  const tool = useMemo(() => resolveTool(profile, override), [profile, override]);

  // Use a tool for this session only.
  const setOverride = useCallback((choice) => {
    setOverrideState(choice ? normalizeTool(choice) : null);
  }, []);

  // Make a tool the saved default and clear any session override.
  const saveAsDefault = useCallback(
    (choice) => {
      const t = normalizeTool(choice);
      const stored = t.id === 'other' ? { id: 'other', label: t.label, url: t.url } : t.id;
      updateProfile?.({ preferred_tool: stored });
      setOverrideState(null);
    },
    [updateProfile]
  );

  const value = useMemo(
    () => ({
      tool,
      isOverridden: Boolean(override),
      hasPreference: Boolean(profile?.preferred_tool),
      setOverride,
      saveAsDefault,
    }),
    [tool, override, profile, setOverride, saveAsDefault]
  );

  return <ActiveToolContext.Provider value={value}>{children}</ActiveToolContext.Provider>;
}
