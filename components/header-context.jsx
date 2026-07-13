'use client';

import { createContext, useContext, useState, useMemo } from 'react';

// Shared home for the current page's top-bar content (icon/title/subtitle).
// Lets <PageHeader> (called per-page) hand its content to <HeaderBar>
// (rendered once in the root layout) instead of rendering its own <header>,
// so the bar itself never unmounts between pages.
const HeaderContext = createContext(null);

export function HeaderProvider({ children }) {
  const [header, setHeader] = useState(null);
  // Memoized so consumers (namely <PageHeader>) don't see a new context value
  // on every render of this provider — an unstable value here previously fed
  // straight back into a consumer's effect deps and caused an infinite loop.
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContext() {
  return useContext(HeaderContext);
}
