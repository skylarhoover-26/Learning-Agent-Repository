'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, Home, ArrowLeft } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Known "where did you come from" origins. A gated link can pass ?from=<key> so
// the block screen offers a contextual way back (e.g. a badge tile that points
// at a not-yet-available page sends the learner back to the badges page rather
// than all the way home).
const FROM_ORIGINS = {
  achievements: { label: 'Back to badges', href: '/achievements' },
};

// Blocks non-admins from reaching a page whose menu entry has been turned off
// (e.g. an old bookmark or a pasted /prompts link). Admins always pass through.
// Until the visibility config has loaded we render the page as-is to avoid a
// loading spinner on every navigation; the menu also hides the entry, so the
// only way to land here pre-load is a direct URL.
export default function FeatureGuard({ children }) {
  const pathname = usePathname();
  const { loaded, routeState } = useMenuVisibility();

  if (loaded) {
    const state = routeState(pathname);
    // "coming soon" gets the teaser; "hidden" gets a neutral not-available page
    // so we don't tease something that's meant to be invisible.
    if (state === 'coming_soon') return <Blocked variant="coming_soon" />;
    if (state === 'hidden') return <Blocked variant="hidden" />;
  }
  return children;
}

function Blocked({ variant }) {
  const comingSoon = variant === 'coming_soon';
  // Read ?from in an effect (client-only) so we don't force every page that
  // FeatureGuard wraps to opt out of static rendering via useSearchParams.
  const [origin, setOrigin] = useState(null);
  useEffect(() => {
    try {
      const from = new URLSearchParams(window.location.search).get('from');
      setOrigin(FROM_ORIGINS[from] || null);
    } catch {
      // no-op — fall back to "Back home"
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-7 h-7 text-brand" />
        </div>
        <h1 className="text-xl font-semibold text-ink dark:text-slate-100">
          {comingSoon ? 'Coming soon' : 'Page not available'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {comingSoon
            ? "This part of the app isn't available yet. Check back soon — we're still building it out."
            : "This page isn't available yet — we're still building it out."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {origin && (
            <Link
              href={origin.href}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {origin.label}
            </Link>
          )}
          <Link
            href="/"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              origin
                ? 'text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-slate-200'
                : 'bg-brand text-white hover:bg-brand-600'
            }`}
          >
            <Home className="w-4 h-4" />
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
