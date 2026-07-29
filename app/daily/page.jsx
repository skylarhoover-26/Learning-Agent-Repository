import { redirect } from 'next/navigation';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { resolveDailyPick } from '@/lib/daily-pick-server';

// "Today's Pick" is a single personalized lesson, so this route is a pass-through
// into that lesson — not a page anyone should see.
//
// It used to be a client component: it painted "Finding today's pick for you…",
// fetched /api/daily-pick in the browser, then client-redirected. That round trip
// reads blob data, so it routinely outlasts any grace period worth having — a
// short delay still flashed the interstitial (feedback #138) and a long one would
// just show a blank screen instead. Both the Slack link and the menu item land
// here, which is why it flashed from both.
//
// Resolving on the server instead means the browser is handed a redirect and never
// renders anything for this route, so there is no interstitial that *can* flash.
// It resolves through the same resolveDailyPick that /api/daily-pick uses, so this
// route, Home's card, and the pre-generated lesson all still agree on the pick.
export const dynamic = 'force-dynamic';

export default async function TodaysPickRedirect() {
  let href = '/lesson';
  try {
    const profile = await getAuthenticatedProfile();
    const { pick } = await resolveDailyPick(profile);
    if (pick?.href) href = pick.href;
  } catch (error) {
    // Never dead-end the learner: the picker is a reasonable place to land.
    console.error('/daily could not resolve today\'s pick, sending to the picker:', error?.message);
  }
  // Outside the try on purpose — redirect() signals by throwing, so catching it
  // here would swallow the redirect and render nothing.
  redirect(href);
}
