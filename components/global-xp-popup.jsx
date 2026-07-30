'use client';

import { useEffect, useState } from 'react';
import { onXp } from '@/lib/xp-bus';
import { recordXpNotifications } from '@/lib/notifications-store';
import { useProgression } from '@/components/progression-provider';
import XpToast from '@/components/xp-toast';
import LevelUpModal from '@/components/level-up-modal';

// One popup to rule them all. Mounted once app-wide, it listens to the XP bus
// (lessons, chat, games, reviews, quests, admin grants) and to the one-time
// welcome bonus, then shows a single consistent reveal. This is why XP amounts
// no longer appear on buttons — the amount is revealed here, after the action.
//
// A level-up takes over entirely: it routes to the full-screen LevelUpModal and
// the corner toast is skipped, so the learner never has two celebrations to
// dismiss for one action. The +XP amount is shown inside the modal instead.
export default function GlobalXpPopup() {
  const [result, setResult] = useState(null);
  const prog = useProgression();
  const welcomeBonus = prog?.welcomeBonus;
  const clearWelcomeBonus = prog?.clearWelcomeBonus;

  // Show the popup AND log a persistent notification for the bell feed.
  useEffect(() => onXp((r) => { setResult(r); recordXpNotifications(r); }), []);

  useEffect(() => {
    if (welcomeBonus) {
      setResult({ ...welcomeBonus, welcome: true });
      recordXpNotifications(welcomeBonus);
      clearWelcomeBonus?.();
    }
  }, [welcomeBonus, clearWelcomeBonus]);

  if (!result) return null;
  if (result.leveledUp) {
    return <LevelUpModal result={result} onDismiss={() => setResult(null)} />;
  }
  return <XpToast result={result} onDismiss={() => setResult(null)} />;
}
