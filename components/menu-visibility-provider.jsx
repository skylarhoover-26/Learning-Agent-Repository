'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ITEM_SECTION_BY_HREF, INTERNAL_ITEM_HREFS } from '@/lib/menu-catalog';

// Fetches admin status + the menu-visibility config ONCE and shares it with both
// the sidebar (which greys out disabled entries) and the route guard (which
// blocks disabled pages). Admins are never gated — the toggles only hide things
// from regular users.
const MenuVisibilityContext = createContext(null);

const PREVIEW_KEY = 'mv_preview_as_user';

export function MenuVisibilityProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [disabledSections, setDisabledSections] = useState([]);
  const [disabledItems, setDisabledItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  // Admin-only "view as a regular user" preview. Persisted so it survives
  // navigation while the admin clicks around testing. Never changes the real
  // admin status — admin pages and the Admin menu stay reachable so the admin
  // can always switch back.
  const [previewAsUser, setPreviewAsUserState] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PREVIEW_KEY) === '1') setPreviewAsUserState(true);
    } catch {
      // localStorage unavailable — preview just stays off
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin-check').then(r => r.json()).catch(() => ({ isAdmin: false })),
      fetch('/api/menu-visibility').then(r => r.json()).catch(() => ({ sections: [], items: [] })),
    ]).then(([admin, vis]) => {
      if (cancelled) return;
      setIsAdmin(!!admin?.isAdmin);
      setDisabledSections(Array.isArray(vis?.sections) ? vis.sections : []);
      setDisabledItems(Array.isArray(vis?.items) ? vis.items : []);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  function setPreviewAsUser(on) {
    setPreviewAsUserState(on);
    try {
      if (on) localStorage.setItem(PREVIEW_KEY, '1');
      else localStorage.removeItem(PREVIEW_KEY);
    } catch {
      // localStorage unavailable — preview still works for this session
    }
  }

  const disabledSectionSet = new Set(disabledSections);
  const disabledItemSet = new Set(disabledItems);
  // Whether the menu/route gating should treat this person as an admin. Real
  // admins previewing as a user are gated like everyone else, but only for the
  // content toggles — their actual admin access is untouched.
  const actingAsAdmin = isAdmin && !previewAsUser;

  // An item is hidden if it's individually disabled OR its whole section is
  // disabled. Nothing is ever disabled for someone acting as an admin.
  function isSectionDisabled(title) {
    return !actingAsAdmin && disabledSectionSet.has(title);
  }
  function isItemDisabled(href) {
    if (actingAsAdmin) return false;
    if (disabledItemSet.has(href)) return true;
    const section = ITEM_SECTION_BY_HREF[href];
    return section ? disabledSectionSet.has(section) : false;
  }

  // Is the current pathname an internal route that's hidden from this user?
  // Matches the longest catalog href that prefixes the path (so /lesson/123
  // resolves to the /lesson toggle).
  function isRouteDisabled(pathname) {
    if (actingAsAdmin || !pathname) return false;
    const match = INTERNAL_ITEM_HREFS
      .filter(href => pathname === href || pathname.startsWith(href + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return match ? isItemDisabled(match) : false;
  }

  return (
    <MenuVisibilityContext.Provider
      value={{
        isAdmin, loaded, previewAsUser, setPreviewAsUser,
        isSectionDisabled, isItemDisabled, isRouteDisabled,
      }}
    >
      {children}
    </MenuVisibilityContext.Provider>
  );
}

export function useMenuVisibility() {
  return useContext(MenuVisibilityContext) || {
    isAdmin: false,
    loaded: false,
    previewAsUser: false,
    setPreviewAsUser: () => {},
    isSectionDisabled: () => false,
    isItemDisabled: () => false,
    isRouteDisabled: () => false,
  };
}
