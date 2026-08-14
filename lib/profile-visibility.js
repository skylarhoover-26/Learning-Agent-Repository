import { getUserData, saveUserData } from './blob-store';
import { PROFILE_ITEM_HREFS } from './profile-catalog';
import { getAssessmentConfig } from './assessment-config-store';

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

// "My Impact" is the second half of the assessment: it reports on the calibration
// you took. With the quiz switched off there is no calibration to report on, so
// the item was linking to a page that could only ever be empty.
//
// Returned SEPARATELY from `hiddenItems` rather than folded into it, because the
// admin Profile Visibility page reads the same payload and posts back what it
// read — folding this in would persist the hide, and it would then survive the
// quiz being switched back on. So: computed every read, never stored, and the
// admin page labels it instead of showing it as a manual choice.
//
// (My Calibration takes the other approach — a real write on switch flip. That's
// deliberate: hiding the retake link is a decision an admin may want to reverse
// on its own, while an Impact page with no calibration behind it is just broken.)
export async function getAutoHiddenProfileItems() {
  try {
    const config = await getAssessmentConfig();
    return config?.quiz_enabled === false ? ['/my-impact'] : [];
  } catch {
    return [];
  }
}

export async function setProfileVisibility({ items, hiddenItems } = {}) {
  const cleanHidden = cleanList(hiddenItems);
  const hiddenSet = new Set(cleanHidden);
  const cleanComing = cleanList(items).filter((i) => !hiddenSet.has(i));
  const saved = { items: cleanComing, hiddenItems: cleanHidden };
  await saveUserData(SYSTEM_ID, TYPE, { ...saved, updated_at: new Date().toISOString() });
  return saved;
}
