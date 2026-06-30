import { redirect } from 'next/navigation';

// The Goals tracker was removed from the app. Send old links home.
export default function GoalsRemovedRedirect() {
  redirect('/');
}
