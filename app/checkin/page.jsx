import { redirect } from 'next/navigation';

// The Check-in was removed from the app. Send old links home.
export default function CheckinRemovedRedirect() {
  redirect('/');
}
