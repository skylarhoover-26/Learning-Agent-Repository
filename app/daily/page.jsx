'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useTodaysPick } from '@/components/use-todays-pick';

// "Today's Pick" is a single personalized lesson, so clicking it in the sidebar
// jumps straight into that lesson — no landing page. This route just computes
// the pick and forwards into it (replace, so Back doesn't bounce here).
export default function TodaysPickRedirect() {
  const pick = useTodaysPick();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (pick && !done.current) {
      done.current = true;
      router.replace(pick.href);
    }
  }, [pick, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
      <div className="w-12 h-12 rounded-2xl bg-cta-50 dark:bg-slate-800 ring-1 ring-cta-200 dark:ring-slate-700 flex items-center justify-center text-cta-600">
        <Sparkles className="w-6 h-6 animate-pulse" />
      </div>
      <p className="text-sm">Finding today&rsquo;s pick for you…</p>
    </div>
  );
}
