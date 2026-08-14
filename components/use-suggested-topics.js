'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { contentDayKey } from '@/lib/content-day';
import { signalSignature } from '@/lib/learner-signals';
import { resolveLearnerId } from '@/lib/learner-id';
import { getLessonHistory } from '@/lib/progression';
import { FALLBACK_TOPICS } from '@/lib/fallback-topics';

// The six personalized topics, shared by the Lesson picker and the Games hub.
//
// Extracted from app/lesson/page.jsx when Games started offering the same cards:
// "here's what's worth learning — take it as a lesson, or play it as a game". Two
// copies of this would have meant two caches, two signature rules, and this
// morning's stale-cache bug fixed in one of them.
//
// Suggestions are driven by the PROFILE, not by lesson history, so someone who has
// never opened Lesson still gets a full set the first time they open Games. The
// cache is shared in both directions: whichever surface is opened first pays the
// generation, the other is instant.
const CACHE_KEY = 'lesson_suggested_topics';

// What the cached list is keyed on. `signalSignature` covers department, sub-team,
// tier, tools, tasks, goals and projects, so editing ANY of the four signals the
// suggestions are built from invalidates the list. lessonCount keeps the original
// behaviour of regenerating once you finish a lesson.
function suggestionSignature(profile, projects, lessonCount) {
  return `${signalSignature({ ...profile, work_projects: projects || [] })}|n${lessonCount}`;
}

// Read the cache ONLY if it still matches this learner and today's content-day.
// Runs at mount, before the profile context has resolved, so it reads the copies the
// profile provider keeps in localStorage for exactly this kind of non-React caller.
// Any missing piece, or any mismatch, returns null: showing nothing beats showing
// topics we are about to replace.
function readValidSuggestions() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.topics) || !cached.topics.length) return null;
    if (cached.date !== contentDayKey()) return null;
    const profile = JSON.parse(localStorage.getItem('learner_profile') || 'null');
    if (!profile) return null;
    const projects = JSON.parse(localStorage.getItem('learner_work_projects') || '[]');
    const history = getLessonHistory(resolveLearnerId(profile)) || [];
    if (cached.sig !== suggestionSignature(profile, projects, history.length)) return null;
    return cached.topics;
  } catch {
    return null; // unreadable cache, or no localStorage (server render)
  }
}

/**
 * @param {object}  options
 * @param {boolean} options.enabled  false parks the hook (e.g. the picker isn't showing)
 * @returns {{ topics: Array|null, loading: boolean, fallback: Array }}
 *   topics  — the personalized six, or null when none are confirmed yet
 *   loading — a fresh set is being generated; show skeletons, NOT the fallback,
 *             because the fallback topics are real and clickable
 *   fallback — the generic set, for when generation FAILS
 */
export function useSuggestedTopics({ enabled = true } = {}) {
  const { profile, workProjects } = useProfile() || {};
  const prog = useProgression();

  // Starts null rather than reading the cache inline: a useState initializer also
  // runs during the SERVER render, where localStorage doesn't exist, and returning
  // topics on the client but nothing on the server is a hydration mismatch — whose
  // repair is itself a visible repaint.
  const [topics, setTopics] = useState(null);
  // Starts TRUE so the first paint is skeletons, never the generic list.
  const [loading, setLoading] = useState(true);

  // Mount-only: adopt a still-valid cached list immediately, so a returning learner
  // gets their topics on the first tick instead of waiting on the profile context.
  useEffect(() => {
    const cached = readValidSuggestions();
    if (cached) {
      setTopics(cached);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return undefined; }
    if (!profile) return undefined; // still resolving; keep the skeleton up

    let history = [];
    try { history = getLessonHistory(resolveLearnerId(profile)) || []; } catch { history = []; }
    const recentCompleted = history.map((l) => l.topic).filter(Boolean).slice(-12);
    const sig = suggestionSignature(profile, workProjects, history.length);
    const today = contentDayKey();

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.sig === sig && cached.date === today && Array.isArray(cached.topics) && cached.topics.length) {
        setTopics(cached.topics);
        setLoading(false);
        return undefined;
      }
    } catch {
      // ignore cache read errors
    }

    // Nothing valid to show: clear any stale list and say we're working, rather than
    // leaving old topics on screen to be replaced a few seconds later.
    setTopics(null);
    setLoading(true);

    let cancelled = false;
    fetch('/api/lesson/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exclude: recentCompleted }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.suggestions) && data.suggestions.length) {
          setTopics(data.suggestions);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ sig, date: today, topics: data.suggestions }));
          } catch {
            // ignore cache write errors
          }
        }
      })
      .catch(() => {
        // Generation failed — the caller falls back to FALLBACK_TOPICS.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // prog is read for lesson history via getLessonHistory (localStorage), but its
    // load state is what tells us history is settled.
  }, [enabled, profile, workProjects, prog?.isLoaded]);

  return { topics, loading, fallback: FALLBACK_TOPICS };
}
