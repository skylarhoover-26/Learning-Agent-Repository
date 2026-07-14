import { getUserData, saveUserData } from './blob-store';
import { PROFILE_ITEM_HREFS } from './profile-catalog';

// App-wide visibility for the profile (name) menu items, stored as one system
// blob. Mirrors lib/menu-visibility.js but for profile items only — there are no
// sections here. We persist only what is NOT fully visible, so anything not
// listed defaults to "visible" (adding a new profile item never hides it).
//
// Each item has one of three states:
//   visible      — shown and usable (default; not stored)
//   coming_soon  — shown greyed as "Coming soon", page gated (a teaser)
//   hidden       — removed entirely; no menu entry, page gated
// "hidden" wins over "coming_soon". These toggles only affect NON-admins.
//
// Shape on disk: { items, hiddenItems, updated_at }
const SYSTEM_ID = '__system__';
const TYPE = 'profile_visibility';

const ITEM_SET = new Set(PROFILE_ITEM_HREFS);

const cleanList = (value) =>
  Array.isArray(value) ? [...new Set(value.filter((v) => ITEM_SET.has(v)))] : [];

export async function getProfileVisibility() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  const hiddenItems = cleanList(data?.hiddenItems);
  const hiddenSet = new Set(hiddenItems);
  const items = cleanList(data?.items).filter((i) => !hiddenSet.has(i));
  return { items, hiddenItems };
}

export async function setProfileVisibility({ items, hiddenItems } = {}) {
  const cleanHidden = cleanList(hiddenItems);
  const hiddenSet = new Set(cleanHidden);
  const cleanComing = cleanList(items).filter((i) => !hiddenSet.has(i));
  const saved = { items: cleanComing, hiddenItems: cleanHidden };
  await saveUserData(SYSTEM_ID, TYPE, { ...saved, updated_at: new Date().toISOString() });
  return saved;
}
