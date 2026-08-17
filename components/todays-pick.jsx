'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useTodaysPick } from '@/components/use-todays-pick';
import { REFRESH_LABEL, dailySeed } from '@/lib/content-day';
import EggCapybara from '@/components/egg-capybara';

// Roughly one content day in five. Seeded off the day rather than Math.random so
// it holds still all day and rotates at 8 AM PT with everything else — a mascot
// that blinks in and out on every re-render reads as a bug, not a treat.
function isOrangeDay() {
  return dailySeed('capy-orange') % 5 === 0;
}

// The home-dashboard "Today's Pick" card. The recommendation logic lives in
// useTodaysPick so this card and the sidebar "Today's Pick" redirect agree.
export default function TodaysPick() {
  const pick = useTodaysPick();

  // Resolved after mount: the card server-renders, and branching on the day
  // seed during render would hydrate to a different tree.
  // See lib/easter-eggs.js: todays-pick-orange.
  const [orangeDay, setOrangeDay] = useState(false);
  useEffect(() => { setOrangeDay(isOrangeDay()); }, []);

  if (!pick) return null;

  // The capybara is a SIBLING of the link, not a child: it's a button now, and a
  // button inside an anchor is invalid HTML that also swallows the card's own
  // click target. The wrapper owns the rounding and the clipping so the capybara
  // is still cropped by the card's corner.
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {orangeDay && (
        <EggCapybara
          eggId="todays-pick-orange"
          variant="orange"
          size={74}
          className="absolute -right-2 -bottom-3 z-10 opacity-90"
        />
      )}
    <Link
      href={pick.href}
      data-tour="home-todays-pick"
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-cta-300 hover:shadow-card-hover p-5 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-cta-50 dark:bg-slate-700 ring-1 ring-cta-200 dark:ring-slate-600 flex items-center justify-center text-cta-600 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cta-600 bg-cta-50 px-2 py-0.5 rounded">
              Today&apos;s Pick
            </span>
          </div>
          <h3 className="font-bold text-ink dark:text-slate-200 mb-0.5">{pick.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{pick.description}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">{REFRESH_LABEL}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cta-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      </div>
    </Link>
    </div>
  );
}
