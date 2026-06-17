'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { AI_TOOLS } from '@/lib/ai-tools';

// Provides the merged AI tool catalog (code defaults + admin overrides) to the
// client. Falls back to the static defaults for the first paint and if the
// fetch fails, so the UI never blanks out.

const ToolCatalogContext = createContext(null);

export function useToolCatalog() {
  return useContext(ToolCatalogContext) || { catalog: AI_TOOLS };
}

export function ToolCatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(AI_TOOLS);

  useEffect(() => {
    let active = true;
    fetch('/api/ai-tools', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (active && Array.isArray(j?.tools) && j.tools.length) setCatalog(j.tools);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <ToolCatalogContext.Provider value={{ catalog }}>{children}</ToolCatalogContext.Provider>;
}
