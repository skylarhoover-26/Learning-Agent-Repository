'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useTodaysPick } from '@/components/use-todays-pick';
import PageHeader from '@/components/page-header';

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
    <div className="min-h-screen">
      <PageHeader icon={Sparkles} title="Today's Pick" subtitle="Your personalized lesson for today" />
      <div className="flex flex-col items-center justify-center gap-3 py-24" style={{ color: 'var(--ink-dim)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--gold))', boxShadow: '0 10px 26px -8px var(--accent)' }}>
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm">Finding today&rsquo;s pick for you…</p>
      </div>
    </div>
  );
}
