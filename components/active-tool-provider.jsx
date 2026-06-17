'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useProfile } from './profile-provider';
import { chosenTools, normalizeTool, serializeTools, toolKey } from '@/lib/ai-tools';

// Holds the AI tool(s) the learner is currently working in. There is ONE source
// of truth: the saved profile (`preferred_tools`, primary first). Changing tools
// anywhere — the lesson callout or the My AI Tools page — writes straight back to
// the profile, so every surface stays in sync. We keep a local optimistic copy
// so the UI updates instantly while the save is in flight.

const ActiveToolContext = createContext(null);

export function useActiveTool() {
  const ctx = useContext(ActiveToolContext);
  if (ctx) return ctx;
  // Safe fallback if used outside the provider (e.g. in isolation).
  return {
    tools: [],
    primaryTool: null,
    hasPreference: false,
    toggleTool: () => {},
    setPrimary: () => {},
  };
}

export function ActiveToolProvider({ children }) {
  const { profile, updateProfile } = useProfile() || {};
  const saved = useMemo(() => chosenTools(profile), [profile]);

  // Optimistic local copy of the saved set. Re-syncs whenever the saved set
  // changes from elsewhere (a fresh load, or an edit on the My AI Tools page).
  const [tools, setTools] = useState(saved);
  const toolsRef = useRef(tools);
  toolsRef.current = tools;

  const savedKey = saved.map(toolKey).join('|');
  useEffect(() => {
    if (toolsRef.current.map(toolKey).join('|') !== savedKey) {
      setTools(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  // Apply a new set: optimistic local update + persist to the profile.
  const apply = useCallback(
    (next) => {
      setTools(next);
      toolsRef.current = next;
      updateProfile?.({ preferred_tools: serializeTools(next) });
    },
    [updateProfile]
  );

  // Add or remove a tool from the set. May empty out — we never force a tool the
  // learner doesn't use; generation falls back to a default on its own.
  const toggleTool = useCallback(
    (choice) => {
      const t = normalizeTool(choice);
      const key = toolKey(t);
      const prev = toolsRef.current;
      const exists = prev.some((x) => toolKey(x) === key);
      apply(exists ? prev.filter((x) => toolKey(x) !== key) : [...prev, t]);
    },
    [apply]
  );

  // Make a tool the primary (move it to the front), adding it if needed.
  const setPrimary = useCallback(
    (choice) => {
      const t = normalizeTool(choice);
      const key = toolKey(t);
      const prev = toolsRef.current;
      apply([t, ...prev.filter((x) => toolKey(x) !== key)]);
    },
    [apply]
  );

  const value = useMemo(
    () => ({
      tools,
      primaryTool: tools[0] || null,
      hasPreference: Boolean(profile?.preferred_tools?.length || profile?.preferred_tool),
      toggleTool,
      setPrimary,
    }),
    [tools, profile, toggleTool, setPrimary]
  );

  return <ActiveToolContext.Provider value={value}>{children}</ActiveToolContext.Provider>;
}
