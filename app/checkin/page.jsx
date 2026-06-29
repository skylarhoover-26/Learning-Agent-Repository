import { redirect } from 'next/navigation';

// Check-in moved into the unified "My Growth" page.
export default function CheckinRedirect() {
  redirect('/growth?tab=checkin');
}
