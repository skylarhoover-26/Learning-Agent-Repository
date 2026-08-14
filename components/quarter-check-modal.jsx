'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/components/profile-provider';
import { isCalibrationPending } from '@/lib/calibration-local';
import { useAssessmentConfig } from '@/lib/use-assessment-config';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { shouldPromptQuarterCheck, currentQuarterKey, currentQuarterLabel, nextQuarterLabel } from '@/lib/quarter-check';
import { chosenTools } from '@/lib/ai-tools';
import { activeProjects } from '@/lib/learner-signals';
import { Briefcase, Target, PanelsTopLeft, FolderKanban, Pencil, Check, X } from 'lucide-react';

// Start-of-quarter check-in: shows the four signals every lesson is built from and
// asks whether they're still right.
//
// It SHOWS the current values rather than saying "go check your profile", which is
// the whole point — a wrong entry is obvious at a glance, confirming costs one
// click, and each row links straight to the screen that fixes just that thing. A
// modal that only points at the profile is homework, and gets dismissed unread.
//
// Non-blocking, unlike the calibration gate, and suppressed while that gate is
// pending so nobody meets two in a row. See lib/quarter-check.js for the rules.
// Same exemptions as the calibration gate: someone re-running onboarding is
// answering these exact questions right now, and the auth screens have no profile.
function isExempt(pathname) {
  return pathname === '/onboarding' || pathname.startsWith('/auth');
}

export default function QuarterCheckModal() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { profile, workProjects, updateProfile } = useProfile() || {};
  // The quiz switch matters, not just the marker: isCalibrationPending only asks
  // "has this person calibrated", and with the quiz switched OFF nobody ever has —
  // so keying the suppression on it alone would hide this modal permanently for a
  // whole org. What we actually want to avoid is stacking on the gate, and the gate
  // only shows when the quiz is enabled.
  const { config, loading: configLoading } = useAssessmentConfig({ enabled: !!profile });
  const { actingAsAdmin } = useMenuVisibility();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Admin preview: this modal cannot fire until a quarter boundary (next: Oct 1),
  // so `?quarter_check=1` forces it up for a look. actingAsAdmin, not isAdmin, so
  // it stays gone in "viewing as a regular user". Read from window rather than
  // useSearchParams: this is mounted in the root layout, where that hook opts the
  // whole tree out of static rendering.
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    try {
      setPreview(new URLSearchParams(window.location.search).get('quarter_check') === '1');
    } catch { /* no window */ }
  }, [pathname]);

  useEffect(() => {
    // isCalibrationPending reads localStorage, so this has to run in an effect
    // rather than during render (same reason onboarding resolves it that way).
    if (!profile || configLoading || isExempt(pathname)) { setOpen(false); return; }
    if (preview && actingAsAdmin) { setOpen(true); return; }
    const calibrationPending = config.quiz_enabled
      && isCalibrationPending(profile, session?.user?.email);
    setOpen(shouldPromptQuarterCheck({ profile, calibrationPending }));
  }, [profile, session?.user?.email, config.quiz_enabled, configLoading, pathname, preview, actingAsAdmin]);

  if (!open || !profile) return null;

  const firstName = (profile.first_name || profile.display_name || '').split(' ')[0];
  const tasks = Array.isArray(profile.top_tasks) ? profile.top_tasks : [];
  const goals = Array.isArray(profile.goals) && profile.goals.length
    ? profile.goals
    : (profile.goal ? profile.goal.split(';').map((g) => g.trim()).filter(Boolean) : []);
  const tools = chosenTools(profile).map((t) => t.label);
  const projects = activeProjects({ work_projects: workProjects }).map((p) => p.title);

  // Recording the answer is what stops it reappearing — on every device, since it
  // lives on the profile. Closing the modal first keeps it responsive; a failed
  // write just means we ask again later, which is the safe direction to fail.
  async function acknowledge() {
    setBusy(true);
    setOpen(false);
    // A preview must not stamp the real answer, or looking at the modal in August
    // would silently satisfy the October check.
    if (preview) { setBusy(false); return; }
    try {
      await updateProfile?.({ profile_checked: currentQuarterKey() });
    } catch {
      /* asked again next load — better than silently marking it done */
    }
    setBusy(false);
  }

  const rows = [
    { icon: Briefcase, label: 'Tasks', values: tasks, href: '/my-tasks' },
    { icon: Target, label: 'Goals', values: goals, href: '/my-goals' },
    { icon: PanelsTopLeft, label: 'Tools', values: tools, href: '/my-tools' },
    { icon: FolderKanban, label: 'Projects', values: projects, href: '/projects' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quarter-check-title"
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={acknowledge}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="quarter-check-title" className="text-xl font-bold text-ink dark:text-slate-100 mb-2 pr-8">
          Happy new quarter{firstName ? `, ${firstName}` : ''} 👋
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          {currentQuarterLabel()} just started. A lot changes in three months, so take 30 seconds
          to check that your work still looks like this — it&rsquo;s what every lesson is built from.
        </p>

        <ul className="space-y-2 mb-6">
          {rows.map(({ icon: Icon, label, values, href }) => (
            <li
              key={label}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                {values.length > 0 ? (
                  <p className="text-sm text-ink dark:text-slate-200">{values.join(', ')}</p>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nothing added yet</p>
                )}
              </div>
              <Link
                href={href}
                onClick={acknowledge}
                aria-label={`Update ${label}`}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-brand hover:bg-brand-50 dark:hover:bg-slate-700 transition-all"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          <Link
            href="/profile"
            onClick={acknowledge}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Update something
          </Link>
          <button
            type="button"
            onClick={acknowledge}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 disabled:opacity-40 transition-all"
          >
            <Check className="w-4 h-4" />
            Looks right
          </button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">
          We&rsquo;ll check again at the start of {nextQuarterLabel()}.
        </p>
      </div>
    </div>
  );
}
