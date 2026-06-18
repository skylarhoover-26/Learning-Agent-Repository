'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Tracks which learners currently hold their department crown, so the crown can
// be "worn" everywhere (profile header, nav). The full leaderboard computation
// lists every user blob, so we do it at most once per browser session and cache
// the result — the leaderboard page itself refreshes the live view on demand.

const ChampionContext = createContext({ championIds: new Set(), refresh: () => {} });

export function useChampions() {
  return useContext(ChampionContext);
}

const CACHE_KEY = 'lp_champion_ids';
const SESSION_FLAG = 'lp_champion_fetched';

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

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return;
      sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
      // sessionStorage unavailable — fetch anyway
    }
    refresh();
  }, [refresh]);

  return (
    <ChampionContext.Provider value={{ championIds, refresh }}>
      {children}
    </ChampionContext.Provider>
  );
}
