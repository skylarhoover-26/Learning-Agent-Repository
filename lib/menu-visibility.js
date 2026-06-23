import { getUserData, saveUserData } from './blob-store';
import { CATALOG_SECTION_TITLES, CATALOG_ITEM_HREFS } from './menu-catalog';

// App-wide menu visibility, stored as a single system blob. We persist only what
// is NOT fully visible, so the default for anything not listed is "visible" —
// adding new menu items never accidentally hides them. Mirrors the skill-levels
// pattern.
//
// Each section/item has one of three states:
//   visible      — shown and usable (the default; not stored)
//   coming_soon  — shown greyed as "Coming soon", page is gated (a teaser)
//   hidden       — removed entirely; no menu entry, no teaser, page is gated
//
// Shape on disk: { sections, items, hiddenSections, hiddenItems, updated_at }
//   sections        — section titles in "coming soon"
//   items           — item hrefs in "coming soon"
//   hiddenSections  — section titles fully hidden
//   hiddenItems     — item hrefs fully hidden
// "hidden" wins over "coming soon" if a key somehow lands in both.
//
// These toggles only affect NON-admins. Admins always see everything.
const SYSTEM_ID = '__system__';
const TYPE = 'menu_visibility';

const SECTION_SET = new Set(CATALOG_SECTION_TITLES);
const ITEM_SET = new Set(CATALOG_ITEM_HREFS);

const cleanList = (value, allowed) =>
  Array.isArray(value) ? [...new Set(value.filter((v) => allowed.has(v)))] : [];

export async function getMenuVisibility() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  const hiddenSections = cleanList(data?.hiddenSections, SECTION_SET);
  const hiddenItems = cleanList(data?.hiddenItems, ITEM_SET);
  const hiddenSectionSet = new Set(hiddenSections);
  const hiddenItemSet = new Set(hiddenItems);
  // A key that's hidden can't also be "coming soon" — hidden wins.
  const sections = cleanList(data?.sections, SECTION_SET).filter((s) => !hiddenSectionSet.has(s));
  const items = cleanList(data?.items, ITEM_SET).filter((i) => !hiddenItemSet.has(i));
  return { sections, items, hiddenSections, hiddenItems };
}

// Persist the state lists. Ignores anything not in the catalog so a stale or
// malformed payload can't hide Settings/Admin or invent unknown keys. "hidden"
// takes precedence, so a key in both lists ends up only in the hidden one.
export async function setMenuVisibility({ sections, items, hiddenSections, hiddenItems } = {}) {
  const cleanHiddenSections = cleanList(hiddenSections, SECTION_SET);
  const cleanHiddenItems = cleanList(hiddenItems, ITEM_SET);
  const hiddenSectionSet = new Set(cleanHiddenSections);
  const hiddenItemSet = new Set(cleanHiddenItems);
  const cleanSections = cleanList(sections, SECTION_SET).filter((s) => !hiddenSectionSet.has(s));
  const cleanItems = cleanList(items, ITEM_SET).filter((i) => !hiddenItemSet.has(i));
  const saved = {
    sections: cleanSections,
    items: cleanItems,
    hiddenSections: cleanHiddenSections,
    hiddenItems: cleanHiddenItems,
  };
  await saveUserData(SYSTEM_ID, TYPE, { ...saved, updated_at: new Date().toISOString() });
  return saved;
}
