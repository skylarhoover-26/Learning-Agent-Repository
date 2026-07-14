'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { crownTierFromIds } from '@/lib/crown';

// Tracks who currently holds a crown (the top 3 learners), so it can be "worn"
// everywhere (profile header, nav, avatar locker). `championIds` is ordered
// #1/#2/#3, so `crownTier(id)` maps a learner to gold/silver/bronze (1/2/3) or 0.
// We hydrate instantly from a cached value to avoid a flicker, then refresh from
// the live leaderboard on every load so crown status (and the unlocked Crown in
// the locker) is never stale — e.g. right after you take a top spot.

const ChampionContext = createContext({ championIds: new Set(), crownTier: () => 0, refresh: () => {} });

export function useChampions() {
  return useContext(ChampionContext);
}

const CACHE_KEY = 'lp_champion_ids';

export function ChampionProvider({ children }) {
  const [championList, setChampionList] = useState(() => []);

  // Hydrate instantly from cache to avoid a crown flicker.
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (Array.isArray(cached) && cached.length) setChampionList(cached);
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
      setChampionList(ids);
      localStorage.setItem(CACHE_KEY, JSON.stringify(ids));
    } catch {
      // best-effort
    }
  }, []);

  // Refresh on every load so the crown reflects the current standings.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    championIds: new Set(championList),
    crownTier: (id) => crownTierFromIds(id, championList),
    refresh,
  }), [championList, refresh]);

  return (
    <ChampionContext.Provider value={value}>
      {children}
    </ChampionContext.Provider>
  );
}
