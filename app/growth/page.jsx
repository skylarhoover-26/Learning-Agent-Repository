import { redirect } from 'next/navigation';

// "My Growth" was split up: AI Impact now lives at /my-impact (profile menu);
// Goals and Check-in were removed. Redirect old links to My Impact.
export default function GrowthRedirect() {
  redirect('/my-impact');
}
