'use client';

import EggCapybara from '@/components/egg-capybara';

export default function GlobalError({ error, reset }) {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 600, margin: '0 auto' }}>
      {/* Everything on this page is inline-styled, including the capybara's
          wrapper: if the failure took the stylesheet with it, Tailwind classes
          would render nothing. The capybara itself is self-contained SVG with no
          CSS dependency, so it survives that case.
          See lib/easter-eggs.js: error-boundary. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <EggCapybara eggId="error-boundary" variant="unplugged" size={72} />
        <h2 style={{ color: '#dc2626', margin: 0 }}>Something went wrong</h2>
      </div>
      <pre style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: 16,
        fontSize: 13,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: '#991b1b',
      }}>
        {error?.message || 'Unknown error'}
        {error?.stack ? '\n\n' + error.stack : ''}
      </pre>
      <button
        onClick={reset}
        style={{
          marginTop: 16,
          padding: '8px 20px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Try again
      </button>
    </div>
  );
}
