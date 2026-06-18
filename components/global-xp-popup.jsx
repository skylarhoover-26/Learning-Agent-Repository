'use client';

import { useEffect, useState } from 'react';
import { onXp } from '@/lib/xp-bus';
import { useProgression } from '@/components/progression-provider';
import XpToast from '@/components/xp-toast';

// One popup to rule them all. Mounted once app-wide, it listens to the XP bus
// (lessons, chat, games, reviews, quests, admin grants) and to the one-time
// welcome bonus, then shows a single consistent reveal. This is why XP amounts
// no longer appear on buttons — the amount is revealed here, after the action.
export default function GlobalXpPopup() {
  const [result, setResult] = useState(null);
  const prog = useProgression();
  const welcomeBonus = prog?.welcomeBonus;
  const clearWelcomeBonus = prog?.clearWelcomeBonus;

  useEffect(() => onXp((r) => setResult(r)), []);

  useEffect(() => {
    if (welcomeBonus) {
      setResult({ ...welcomeBonus, welcome: true });
      clearWelcomeBonus?.();
    }
  }, [welcomeBonus, clearWelcomeBonus]);

  if (!result) return null;
  return <XpToast result={result} onDismiss={() => setResult(null)} />;
}
