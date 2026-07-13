'use client';

import { createContext, useContext, useState } from 'react';

// Shared home for the current page's top-bar content (icon/title/subtitle).
// Lets <PageHeader> (called per-page) hand its content to <HeaderBar>
// (rendered once in the root layout) instead of rendering its own <header>,
// so the bar itself never unmounts between pages.
const HeaderContext = createContext(null);

export function HeaderProvider({ children }) {
  const [header, setHeader] = useState(null);
  return (
    <HeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContext() {
  return useContext(HeaderContext);
}
