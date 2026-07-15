'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import {
  Sparkles, LogIn, Gamepad2, BookOpen, MessageCircle, PenTool, ShieldCheck,
  Rss, Trophy,
} from 'lucide-react';

// Small "what's inside" chips — a quiet echo of the home's "Ways to learn" set,
// there to give the entrance a little life without cluttering a login screen.
const HINTS = [
  { icon: Gamepad2, label: 'Games' },
  { icon: BookOpen, label: 'Lessons' },
  { icon: MessageCircle, label: 'Coaching' },
  { icon: PenTool, label: 'Practice' },
  { icon: Rss, label: 'AI News' },
  { icon: Trophy, label: 'Compete' },
];

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_OKTA_CONFIGURED) {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router]);

  if (!process.env.NEXT_PUBLIC_OKTA_CONFIGURED) {
    return (
      <div className="cine min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--ink-dim)' }}>Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="cine min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Drifting glow blobs — same living-background language as the home hero. */}
      <span
        aria-hidden
        className="cine-blob1 pointer-events-none absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(0,85,255,.28), transparent 70%)' }}
      />
      <span
        aria-hidden
        className="cine-blob2 pointer-events-none absolute -bottom-28 -right-20 w-[24rem] h-[24rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,183,6,.22), transparent 70%)' }}
      />

      {/* Glass card, animated in. */}
      <div className="cine-rise cine-glass relative w-full max-w-md rounded-[28px] px-8 py-10 sm:px-10 sm:py-12 text-center">
        {/* Gradient logo mark — mirrors the top-bar / drawer badge. */}
        <span
          className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))', boxShadow: '0 0 30px -6px var(--accent)' }}
        >
          <Sparkles className="w-8 h-8 text-white" strokeWidth={2.4} />
        </span>

        <h1 className="font-display font-extrabold text-4xl sm:text-[2.75rem] leading-[1.05] tracking-tight">
          <span className="cine-grad-flow">AI Learning Coach</span>
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--ink-dim)' }}>
          Your personal AI coach at <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Housecall Pro</span>
        </p>

        {/* What's inside — quiet chips. */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {HINTS.map((h) => (
            <span
              key={h.label}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink-dim)' }}
            >
              <h.icon className="w-3.5 h-3.5" style={{ color: 'var(--accent2)' }} />
              {h.label}
            </span>
          ))}
        </div>

        {error && (
          <div
            className="mt-7 rounded-2xl p-4 text-sm text-left"
            style={{ background: 'color-mix(in srgb, #E5484D 12%, transparent)', border: '1px solid color-mix(in srgb, #E5484D 32%, transparent)', color: '#E5484D' }}
          >
            {error === 'AccessDenied'
              ? 'Access denied. Only @housecallpro.com accounts can sign in.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        <button
          onClick={() => signIn('okta', { callbackUrl })}
          className="cine-pill cine-lift mt-8 w-full inline-flex items-center justify-center gap-2.5 h-14 px-6 font-semibold text-base"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Okta
        </button>

        <p className="mt-5 inline-flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--ink-dim)' }}>
          <ShieldCheck className="w-3.5 h-3.5" />
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
