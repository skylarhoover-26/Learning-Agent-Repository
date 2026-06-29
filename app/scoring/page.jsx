import { redirect } from 'next/navigation';

// AI Impact moved into the unified "My Growth" page. Keep this route as a
// redirect so old links/bookmarks (and the impact-assessment modal) still land
// on the right tab.
export default function ScoringRedirect() {
  redirect('/growth?tab=impact');
}
