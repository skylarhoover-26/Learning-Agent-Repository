'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Home } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Blocks non-admins from reaching a page whose menu entry has been turned off
// (e.g. an old bookmark or a pasted /prompts link). Admins always pass through.
// Until the visibility config has loaded we render the page as-is to avoid a
// loading spinner on every navigation; the menu also hides the entry, so the
// only way to land here pre-load is a direct URL.
export default function FeatureGuard({ children }) {
  const pathname = usePathname();
  const { loaded, isRouteDisabled } = useMenuVisibility();

  if (loaded && isRouteDisabled(pathname)) {
    return <ComingSoon />;
  }
  return children;
}

function ComingSoon() {
  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-7 h-7 text-brand" />
        </div>
        <h1 className="text-xl font-semibold text-ink dark:text-slate-100">Coming soon</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This part of the app isn&apos;t available yet. Check back soon — we&apos;re still building it out.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back home
        </Link>
      </div>
    </div>
  );
}
