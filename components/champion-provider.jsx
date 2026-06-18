'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Tracks who currently holds the crown (the #1 learner), so it can be "worn"
// everywhere (profile header, nav, avatar locker). We hydrate instantly from a
// cached value to avoid a flicker, then refresh from the live leaderboard on
// every load so champion status (and the unlocked Crown in the locker) is never
// stale — e.g. right after you take the #1 spot.

const ChampionContext = createContext({ championIds: new Set(), refresh: () => {} });

export function useChampions() {
  return useContext(ChampionContext);
}

const CACHE_KEY = 'lp_champion_ids';

export function ChampionProvider({ children }) {
  const [championIds, setChampionIds] = useState(() => new Set());

  // Hydrate instantly from cache to avoid a crown flicker.
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (Array.isArray(cached) && cached.length) setChampionIds(new Set(cached));
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const ids = Array.isArray(data.championIds) ? data.championIds : [];
      setChampionIds(new Set(ids));
      localStorage.setItem(CACHE_KEY, JSON.stringify(ids));
    } catch {
      // best-effort
    }
  }, []);

  // Refresh on every load so the crown reflects the current standings.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ChampionContext.Provider value={{ championIds, refresh }}>
      {children}
    </ChampionContext.Provider>
  );
}
