import Link from 'next/link';
import EggCapybara from '@/components/egg-capybara';

// Intentionally NOT a client component: as a server component the page
// prerenders its markup, and EggCapybara is already 'use client' so the
// find-recording still runs on the client.

// There was no 404 page before this — a bad URL fell through to the framework
// default. A wrong link is the most ordinary way to end up somewhere broken, so
// it gets a real page and the same capybara as the error boundary.
// See lib/easter-eggs.js: error-boundary.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <EggCapybara eggId="error-boundary" variant="unplugged" size={132} className="mx-auto" />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[.18em] text-brand-600 dark:text-brand-300">
          404
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-slate-100">
          This page isn&apos;t plugged in
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The link may be out of date, or the page may have moved. Nothing you did caused it.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-600 transition-colors"
        >
          Back to your home
        </Link>
      </div>
    </div>
  );
}
