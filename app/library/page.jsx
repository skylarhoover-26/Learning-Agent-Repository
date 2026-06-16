import { redirect } from 'next/navigation';

// The Use Case Library now lives on the combined Discovery Library page (/discover).
export default function LibraryPage() {
  redirect('/discover');
}
