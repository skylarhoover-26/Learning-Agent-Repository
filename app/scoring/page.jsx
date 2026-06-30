import { redirect } from 'next/navigation';

// AI Impact now lives at /my-impact (reached from the profile dropdown).
export default function ScoringRedirect() {
  redirect('/my-impact');
}
