'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ITEM_SECTION_BY_HREF, INTERNAL_ITEM_HREFS } from '@/lib/menu-catalog';
import { PROFILE_ITEM_HREFS } from '@/lib/profile-catalog';

// Profile-menu items that map to a real internal page we can route-guard.
const PROFILE_INTERNAL_HREFS = PROFILE_ITEM_HREFS.filter((h) => h.startsWith('/'));

// Fetches admin status + the menu-visibility config ONCE and shares it with both
// the sidebar (which greys out disabled entries) and the route guard (which
// blocks disabled pages). Admins are never gated — the toggles only hide things
// from regular users.
const MenuVisibilityContext = createContext(null);

const PREVIEW_KEY = 'mv_preview_as_user';

export function MenuVisibilityProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false); // has direct reports (gates the Manager section)
  const [disabledSections, setDisabledSections] = useState([]); // "coming soon"
  const [disabledItems, setDisabledItems] = useState([]); // "coming soon"
  const [hiddenSections, setHiddenSections] = useState([]); // removed entirely
  const [hiddenItems, setHiddenItems] = useState([]); // removed entirely
  const [profileComingItems, setProfileComingItems] = useState([]); // "coming soon"
  const [profileHiddenItems, setProfileHiddenItems] = useState([]); // removed entirely
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
      fetch('/api/admin-check', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ isAdmin: false })),
      fetch('/api/menu-visibility', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ sections: [], items: [] })),
      fetch('/api/profile-visibility', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ items: [], hiddenItems: [] })),
    ]).then(([admin, vis, profileVis]) => {
      if (cancelled) return;
      setIsAdmin(!!admin?.isAdmin);
      applyVisibility(vis);
      applyProfileVisibility(profileVis);
      setLoaded(true);
    });

    // Manager status is fetched on its OWN track — it can be slow (it may refresh
    // the org data from Snowflake), and it must never delay admin status or the
    // rest of the menu from rendering. The Manager section just appears once this
    // resolves.
    fetch('/api/manager-check', { cache: 'no-store' })
      .then(r => r.json())
      .then(mgr => { if (!cancelled) setIsManager(!!mgr?.isManager); })
      .catch(() => { /* not a manager / lookup failed */ });
    return () => { cancelled = true; };
  }, []);

  function applyVisibility(vis) {
    setDisabledSections(Array.isArray(vis?.sections) ? vis.sections : []);
    setDisabledItems(Array.isArray(vis?.items) ? vis.items : []);
    setHiddenSections(Array.isArray(vis?.hiddenSections) ? vis.hiddenSections : []);
    setHiddenItems(Array.isArray(vis?.hiddenItems) ? vis.hiddenItems : []);
  }

  function applyProfileVisibility(vis) {
    setProfileComingItems(Array.isArray(vis?.items) ? vis.items : []);
    setProfileHiddenItems(Array.isArray(vis?.hiddenItems) ? vis.hiddenItems : []);
  }

  // Re-pull the saved config so the live menu/route gating reflects a just-saved
  // change without a full page reload. Called by the admin pages after a save.
  async function refresh() {
    try {
      const [vis, profileVis] = await Promise.all([
        fetch('/api/menu-visibility', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/profile-visibility', { cache: 'no-store' }).then(r => r.json()),
      ]);
      applyVisibility(vis);
      applyProfileVisibility(profileVis);
    } catch {
      // keep the current config if the refresh fails
    }
  }

  function setPreviewAsUser(on) {
    setPreviewAsUserState(on);
    try {
      if (on) localStorage.setItem(PREVIEW_KEY, '1');
      else localStorage.removeItem(PREVIEW_KEY);
    } catch {
      // localStorage unavailable — preview still works for this session
    }
  }

  const comingSectionSet = new Set(disabledSections);
  const comingItemSet = new Set(disabledItems);
  const hiddenSectionSet = new Set(hiddenSections);
  const hiddenItemSet = new Set(hiddenItems);
  const profileComingSet = new Set(profileComingItems);
  const profileHiddenSet = new Set(profileHiddenItems);
  // Whether the menu/route gating should treat this person as an admin. Real
  // admins previewing as a user are gated like everyone else, but only for the
  // content toggles — their actual admin access is untouched.
  const actingAsAdmin = isAdmin && !previewAsUser;

  // The effective state of a section/item for THIS viewer: 'visible',
  // 'coming_soon' (greyed teaser, page gated), or 'hidden' (gone entirely).
  // An item inherits its section's non-visible state. "hidden" wins over
  // "coming soon". Admins always see everything.
  function sectionState(title) {
    if (actingAsAdmin) return 'visible';
    if (hiddenSectionSet.has(title)) return 'hidden';
    if (comingSectionSet.has(title)) return 'coming_soon';
    return 'visible';
  }
  function itemState(href) {
    if (actingAsAdmin) return 'visible';
    const section = ITEM_SECTION_BY_HREF[href];
    if (hiddenItemSet.has(href) || (section && hiddenSectionSet.has(section))) return 'hidden';
    if (comingItemSet.has(href) || (section && comingSectionSet.has(section))) return 'coming_soon';
    return 'visible';
  }

  // Profile-menu items live in their own config (no sections). Same three-state
  // model, same admin exemption.
  function profileItemState(href) {
    if (actingAsAdmin) return 'visible';
    if (profileHiddenSet.has(href)) return 'hidden';
    if (profileComingSet.has(href)) return 'coming_soon';
    return 'visible';
  }

  const isSectionHidden = (title) => sectionState(title) === 'hidden';
  const isSectionComingSoon = (title) => sectionState(title) === 'coming_soon';
  const isItemHidden = (href) => itemState(href) === 'hidden';
  const isItemComingSoon = (href) => itemState(href) === 'coming_soon';
  const isProfileItemHidden = (href) => profileItemState(href) === 'hidden';
  const isProfileItemComingSoon = (href) => profileItemState(href) === 'coming_soon';
  // "Disabled" = not fully visible (either teased or hidden) — used to drop
  // home-page cards/links and gate routes.
  const isSectionDisabled = (title) => sectionState(title) !== 'visible';
  const isItemDisabled = (href) => itemState(href) !== 'visible';

  // The state of the current pathname's internal route. Matches the longest
  // href that prefixes the path (so /lesson/123 resolves to /lesson), across
  // BOTH the menu catalog and the profile menu, so a hidden profile item's page
  // is gated just like a hidden menu item's.
  function routeState(pathname) {
    if (actingAsAdmin || !pathname) return 'visible';
    const prefixes = (href) => pathname === href || pathname.startsWith(href + '/');
    const menuMatch = INTERNAL_ITEM_HREFS.filter(prefixes).sort((a, b) => b.length - a.length)[0];
    const profileMatch = PROFILE_INTERNAL_HREFS.filter(prefixes).sort((a, b) => b.length - a.length)[0];
    // Prefer the more specific (longer) match if both catalogs have one.
    if (menuMatch && (!profileMatch || menuMatch.length >= profileMatch.length)) return itemState(menuMatch);
    if (profileMatch) return profileItemState(profileMatch);
    return 'visible';
  }
  const isRouteDisabled = (pathname) => routeState(pathname) !== 'visible';

  return (
    <MenuVisibilityContext.Provider
      value={{
        isAdmin, actingAsAdmin, isManager, loaded, previewAsUser, setPreviewAsUser, refresh,
        sectionState, itemState, routeState, profileItemState,
        isSectionHidden, isSectionComingSoon, isItemHidden, isItemComingSoon,
        isProfileItemHidden, isProfileItemComingSoon,
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
    actingAsAdmin: false,
    isManager: false,
    loaded: false,
    previewAsUser: false,
    setPreviewAsUser: () => {},
    refresh: () => {},
    sectionState: () => 'visible',
    itemState: () => 'visible',
    routeState: () => 'visible',
    profileItemState: () => 'visible',
    isSectionHidden: () => false,
    isSectionComingSoon: () => false,
    isItemHidden: () => false,
    isItemComingSoon: () => false,
    isProfileItemHidden: () => false,
    isProfileItemComingSoon: () => false,
    isSectionDisabled: () => false,
    isItemDisabled: () => false,
    isRouteDisabled: () => false,
  };
}
