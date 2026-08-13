'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { isFirstImpactDue } from '@/lib/impact-schedule';
import { useAssessmentConfig } from '@/lib/use-assessment-config';
import { impactActive } from '@/lib/assessment-config';

// Persistent home card for the deferred AI Impact assessment. Deliberately
// survives a "remind me later" on the modal — dismissing an interruption should
// silence the interruption, not quietly bury the thing itself. Disappears once
// the assessment is done.
//
// Client-only mount check: isFirstImpactDue reads localStorage, so rendering it
// during SSR would hydrate-mismatch.
export default function ImpactAssessmentCard() {
  const { profile } = useProfile();
  const { config, loading } = useAssessmentConfig();
  const [due, setDue] = useState(false);
  // The card outlives a snooze on purpose, so it has to honour the switch itself
  // — otherwise turning the assessment off would leave a permanent invitation to
  // it sitting on the home screen.
  const active = !loading && impactActive(config);

  useEffect(() => {
    setDue(active && isFirstImpactDue(profile));
  }, [profile, active]);

  if (!due) return null;

  return (
    <Link
      href="/calibration?part=impact"
      className="group block rounded-2xl border border-brand-200 dark:border-brand/30 bg-brand-50 dark:bg-brand/10 p-5 transition-all hover:border-brand hover:shadow-card"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">
            Ready for you
          </p>
          <h3 className="text-base font-bold text-ink dark:text-slate-100 mb-1">
            Your AI Impact assessment
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">
            Four questions on how AI is changing your work, your team, and your results.
            Nothing to write &mdash; pick the option that sounds like you and you&apos;re done.
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-brand shrink-0 mt-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
