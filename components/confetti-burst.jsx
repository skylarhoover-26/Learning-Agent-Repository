'use client';

import { useState, useEffect } from 'react';

// A lightweight, dependency-free confetti drop for celebratory moments (lesson
// complete). Pure CSS animation over absolutely-positioned pieces — no canvas,
// no library. Self-unmounts after the animation and respects reduced-motion.
const COLORS = ['#2563eb', '#f59e0b', '#22c55e', '#ec4899', '#a855f7', '#06b6d4', '#facc15'];

function buildPieces(count) {
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const round = i % 3 === 0;
    pieces.push({
      left: Math.round(Math.random() * 100),
      size: 6 + Math.round(Math.random() * 8),
      color: COLORS[i % COLORS.length],
      duration: 2.6 + Math.random() * 1.8,
      delay: Math.random() * 0.7,
      drift: `${Math.round(Math.random() * 200 - 100)}px`,
      spin: `${Math.round(540 + Math.random() * 540)}deg`,
      round,
    });
  }
  return pieces;
}

export default function ConfettiBurst({ count = 110, onDone }) {
  const [pieces] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return [];
    return buildPieces(count);
  });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.(); }, 5200);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible || pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(0, -12vh, 0) rotateZ(0deg); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--cf-drift), 110vh, 0) rotateZ(var(--cf-spin)); opacity: 0; }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.round ? p.size : Math.round(p.size * 1.6)}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
            '--cf-drift': p.drift,
            '--cf-spin': p.spin,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
