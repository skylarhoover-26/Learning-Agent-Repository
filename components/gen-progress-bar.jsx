'use client';

import { useEffect, useState } from 'react';

// The generating-progress bar, shared by the pre-game start screen and the
// standalone GameGenLoading fallback. Both showed the same wait and only one of
// them drew a bar, so the bar lives here and neither can drift from the other.
//
// It eases toward ~92% across the expected window and never finishes on its own —
// the generated content arriving unmounts it. That's deliberate: a bar that sat at
// 100% while you still waited would read as stuck.
export default function GenProgressBar({ estimateSeconds = 18, className = '' }) {
  const [pct, setPct] = useState(6);

  useEffect(() => {
    const start = Date.now();
    setPct(6);
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setPct(Math.min(92, 6 + (elapsed / estimateSeconds) * 86));
    }, 200);
    return () => clearInterval(id);
  }, [estimateSeconds]);

  return (
    <div
      className={`h-1.5 rounded-full overflow-hidden mx-auto max-w-xs ${className}`}
      style={{ background: 'var(--line, rgba(10,36,67,.1))' }}
      role="progressbar"
      aria-label="Generating"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-200 ease-out"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--accent, #0055FF), var(--accent2, #3B94FF))',
        }}
      />
    </div>
  );
}
