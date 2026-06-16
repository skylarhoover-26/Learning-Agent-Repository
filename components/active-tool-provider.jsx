'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useProfile } from './profile-provider';
import { chosenTools, normalizeTool, normalizeTools, serializeTools, toolKey } from '@/lib/ai-tools';

// Holds the AI tool(s) the learner is currently working in. The saved set lives
// on the profile (`preferred_tools`, primary first); a per-session override set
// from the "open your tool" callout wins for the current session without
// changing the saved default. Pages read `tools` and pass it to the generation
// APIs so the coach tailors its guidance; the callout reads `primaryTool` to
// show the right "open" button.

const ActiveToolContext = createContext(null);

export function useActiveTool() {
  const ctx = useContext(ActiveToolContext);
  if (ctx) return ctx;
  // Safe fallback if used outside the provider (e.g. in isolation).
  return {
    tools: [],
    primaryTool: null,
    isOverridden: false,
    hasPreference: false,
    toggleTool: () => {},
    setPrimary: () => {},
    saveAsDefault: () => {},
  };
}

export function ActiveToolProvider({ children }) {
  const { profile, updateProfile } = useProfile() || {};
  // null = follow the saved profile set; an array = a session-only override.
  const [overrideTools, setOverrideTools] = useState(null);

  const tools = useMemo(() => chosenTools(profile, overrideTools), [profile, overrideTools]);

  // Add or remove a tool from the active set (session-only). May empty out —
  // we never force a tool the learner doesn't use.
  const toggleTool = useCallback(
    (choice) => {
      const t = normalizeTool(choice);
      const key = toolKey(t);
      const exists = tools.some((x) => toolKey(x) === key);
      const next = exists ? tools.filter((x) => toolKey(x) !== key) : [...tools, t];
      setOverrideTools(next);
    },
    [tools]
  );

  // Make a tool the primary (move it to the front), adding it if needed.
  const setPrimary = useCallback(
    (choice) => {
      const t = normalizeTool(choice);
      const key = toolKey(t);
      const rest = tools.filter((x) => toolKey(x) !== key);
      setOverrideTools([t, ...rest]);
    },
    [tools]
  );

  // Persist the given set (or the current effective set) as the saved default.
  const saveAsDefault = useCallback(
    (set) => {
      const next = normalizeTools(set || tools);
      updateProfile?.({ preferred_tools: serializeTools(next) });
      setOverrideTools(null);
    },
    [tools, updateProfile]
  );

  const value = useMemo(
    () => ({
      tools,
      primaryTool: tools[0] || null,
      isOverridden: overrideTools !== null,
      hasPreference: Boolean(profile?.preferred_tools?.length || profile?.preferred_tool),
      toggleTool,
      setPrimary,
      saveAsDefault,
    }),
    [tools, overrideTools, profile, toggleTool, setPrimary, saveAsDefault]
  );

  return <ActiveToolContext.Provider value={value}>{children}</ActiveToolContext.Provider>;
}
