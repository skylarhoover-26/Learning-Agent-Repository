import { getUserData, saveUserData } from './blob-store';
import { CATALOG_SECTION_TITLES, CATALOG_ITEM_HREFS } from './menu-catalog';

// App-wide menu visibility, stored as a single system blob. We persist only what
// is DISABLED, so the default for anything not listed is "visible" — adding new
// menu items never accidentally hides them. Mirrors the skill-levels pattern.
//
// Shape on disk: { sections: string[], items: string[], updated_at }
//   sections — section titles hidden in full (e.g. "Learn")
//   items    — individual item hrefs hidden (e.g. "/prompts")
//
// These toggles only affect NON-admins. Admins always see everything.
const SYSTEM_ID = '__system__';
const TYPE = 'menu_visibility';

const SECTION_SET = new Set(CATALOG_SECTION_TITLES);
const ITEM_SET = new Set(CATALOG_ITEM_HREFS);

export async function getMenuVisibility() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  const sections = Array.isArray(data?.sections) ? data.sections.filter(s => SECTION_SET.has(s)) : [];
  const items = Array.isArray(data?.items) ? data.items.filter(i => ITEM_SET.has(i)) : [];
  return { sections, items };
}

// Persist the disabled lists. Ignores anything not in the catalog so a stale or
// malformed payload can't hide Settings/Admin or invent unknown keys.
export async function setMenuVisibility({ sections, items } = {}) {
  const cleanSections = Array.isArray(sections)
    ? [...new Set(sections.filter(s => SECTION_SET.has(s)))]
    : [];
  const cleanItems = Array.isArray(items)
    ? [...new Set(items.filter(i => ITEM_SET.has(i)))]
    : [];
  await saveUserData(SYSTEM_ID, TYPE, {
    sections: cleanSections,
    items: cleanItems,
    updated_at: new Date().toISOString(),
  });
  return { sections: cleanSections, items: cleanItems };
}
