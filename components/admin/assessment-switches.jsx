'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { impactActive } from '@/lib/assessment-config';
import { clearAssessmentConfigCache } from '@/lib/use-assessment-config';

// The two master switches for the assessments, saved the moment they're flipped
// (they're one boolean each — a Save button would only add a way to forget).
//
// These exist because there was previously no way to stop the placement quiz
// running. Switching every question off isn't accepted — an empty quiz would
// strand new users on a blank required screen — so the only route was deleting
// authored questions, and the questions are the expensive part.
//
// The two switches are INDEPENDENT. The impact one was briefly chained to the
// quiz, because its timers counted from a date only the quiz wrote; impact now
// falls back to the onboarding date instead (lib/impact-schedule.js), so either
// assessment can run without the other.

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

function Row({ title, children, checked, onChange, disabled, label }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink dark:text-slate-100">{title}</h3>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 space-y-1">{children}</div>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

export default function AssessmentSwitches({ onChange }) {
  const [config, setConfig] = useState(null); // null = loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [menuNote, setMenuNote] = useState(null);

  useEffect(() => {
    fetch('/api/assessment-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) throw new Error('load failed');
        setConfig(d);
        onChange?.(d);
      })
      .catch(() => setError("Couldn't load the switches. Reload the page."));
    // Deliberately mount-only: re-running on every parent render would refetch
    // the config and stamp over a switch the admin just flipped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flip(patch) {
    setBusy(true);
    setError(null);
    setMenuNote(null);
    try {
      const res = await fetch('/api/assessment-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Save failed');
      setConfig(d);
      onChange?.(d);
      // Other components cache this per page load; drop the cache so the gate and
      // the tour see the new position without a hard refresh.
      clearAssessmentConfigCache();
      if (d.calibration_menu === 'hidden') setMenuNote('“My Calibration” is now hidden from the profile menu.');
      if (d.calibration_menu === 'restored') setMenuNote('“My Calibration” is back in the profile menu.');
    } catch (e) {
      setError(e.message || 'Save failed');
    }
    setBusy(false);
  }

  const quizOn = config?.quiz_enabled !== false;
  const impactOn = config?.impact_enabled !== false;
  const loading = config === null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 space-y-5">
      <Row
        title="Placement quiz"
        checked={quizOn}
        disabled={loading || busy}
        onChange={(next) => flip({ quiz_enabled: next })}
        label="Placement quiz"
      >
        <p>
          The required full-screen quiz every new user answers before they can enter the platform.
          Off means onboarding&apos;s six questions are the whole entry, and their self-rated
          experience level is what starts their lessons.
        </p>
        <p>
          Your questions below are kept either way &mdash; switching this back on brings them back
          exactly as they are.
        </p>
      </Row>

      <p className="text-sm font-medium">
        {loading ? (
          <span className="text-slate-400">Checking…</span>
        ) : quizOn ? (
          <span className="text-green-600 dark:text-green-400">On &mdash; new users have to finish the quiz first.</span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">Off &mdash; nobody is asked, and nobody is scored.</span>
        )}
      </p>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
        <Row
          title="AI Impact assessment"
          checked={impactOn}
          disabled={loading || busy}
          onChange={(next) => flip({ impact_enabled: next })}
          label="AI Impact assessment"
        >
          <p>
            The four self-reported questions that arrive three days after someone starts, and the
            monthly re-grade after that. This one switch stops both &mdash; the modal and the home
            card.
          </p>
          <p>
            Independent of the placement quiz: run either, both, or neither. The three-day clock
            starts when someone finishes the quiz, or when they finish onboarding if the quiz
            isn&apos;t running.
          </p>
        </Row>
        <p className="text-sm mt-3 font-medium">
          {loading ? (
            <span className="text-slate-400">Checking…</span>
          ) : impactActive(config) ? (
            <span className="text-green-600 dark:text-green-400">On &mdash; the day-three prompt and monthly re-grade both run.</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">Off &mdash; no prompt, no home card, no monthly re-grade.</span>
          )}
        </p>
      </div>

      {menuNote && <p className="text-sm text-slate-600 dark:text-slate-400">{menuNote}</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}
    </div>
  );
}
