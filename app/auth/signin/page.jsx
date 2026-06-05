'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-warm dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-ink dark:text-white">
            AI Learning Platform
          </h1>
          <p className="mt-2 text-ink/60 dark:text-slate-400">
            Housecall Pro
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
            {error === 'AccessDenied'
              ? 'Access denied. Only @housecallpro.com accounts can sign in.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        <button
          onClick={() => signIn('okta', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Sign in with Okta
        </button>

        <p className="text-xs text-ink/40 dark:text-slate-500">
          Use your Housecall Pro work account to sign in.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
