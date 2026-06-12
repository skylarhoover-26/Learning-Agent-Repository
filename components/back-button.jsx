'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// Goes to the previous page the learner was on, instead of always jumping to
// the dashboard. Falls back to home when there's no in-app history (e.g. the
// page was opened directly).
export default function BackButton() {
  const router = useRouter();

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  return (
    <button
      onClick={goBack}
      className="p-2 rounded-lg hover:bg-white/10"
      aria-label="Go back to the previous page"
    >
      <ArrowLeft className="w-5 h-5 text-white" />
    </button>
  );
}
