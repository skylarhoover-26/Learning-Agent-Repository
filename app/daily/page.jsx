'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import BookLoader from '@/components/book-loader';
import { useProfile } from '@/components/profile-provider';
import {
  CalendarDays, ChevronLeft, ChevronRight, BookOpen,
  Clock, Zap, Pin, PinOff, ExternalLink, Sparkles,
  ArrowRight,
} from 'lucide-react';

const CATEGORY_STYLES = {
  'Applied AI': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Prompting': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Technical': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Strategy': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Writing': 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const DIFFICULTY_STYLES = {
  'Beginner': 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'Intermediate': 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'Advanced': 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

// Which lesson difficulties to surface for each experience tier. Beginners and
// practitioners never see Advanced ("developer-level") cards; higher tiers skip
// pure-beginner basics. Pinned lessons always show regardless (see below).
const TIER_DIFFICULTIES = {
  beginner: ['Beginner', 'Intermediate'],
  practitioner: ['Beginner', 'Intermediate'],
  power_user: ['Intermediate', 'Advanced'],
  builder: ['Intermediate', 'Advanced'],
  developer: ['Intermediate', 'Advanced'],
};

const TIER_LABELS = {
  beginner: 'Beginner',
  practitioner: 'Practitioner',
  power_user: 'Power User',
  builder: 'Builder',
  developer: 'Developer',
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0];
}

function LessonCard({ lesson, isAdmin, onTogglePin }) {
  const catStyle = CATEGORY_STYLES[lesson.category] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  const diffStyle = DIFFICULTY_STYLES[lesson.difficulty] || DIFFICULTY_STYLES['Intermediate'];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-card border ${lesson.pinned ? 'border-brand-200 dark:border-brand-700 ring-1 ring-brand-100 dark:ring-brand-900/30' : 'border-slate-200 dark:border-slate-700'} p-6 transition-all hover:shadow-card-hover`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium ${catStyle}`}>
            {lesson.category}
          </span>
          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium ${diffStyle}`}>
            {lesson.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {lesson.duration}
          </span>
          {lesson.pinned && (
            <span className="inline-flex items-center gap-1 text-xs text-brand font-medium">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => onTogglePin(lesson.id, !lesson.pinned)}
            className="text-slate-400 hover:text-brand transition-colors p-1"
            title={lesson.pinned ? 'Unpin lesson' : 'Pin lesson'}
          >
            {lesson.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-2">{lesson.title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{lesson.description}</p>

      {lesson.source && lesson.source.title && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <span className="font-medium text-slate-500 dark:text-slate-400">Inspired by:</span>
          {lesson.source.url ? (
            <a
              href={lesson.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline inline-flex items-center gap-1 truncate max-w-xs"
            >
              {lesson.source.title}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <span className="truncate">{lesson.source.title}</span>
          )}
        </div>
      )}

      <Link
        href={`/lesson?topic=${encodeURIComponent(lesson.topic)}&format=${lesson.format || 'interactive'}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
      >
        <Zap className="w-4 h-4" />
        Start Lesson
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function DailyLessonsPage() {
  const { profile } = useProfile();
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [datesRes, adminRes] = await Promise.all([
          fetch('/api/daily-lessons?action=dates'),
          fetch('/api/admin-check'),
        ]);
        const { dates: availDates } = await datesRes.json();
        const adminData = await adminRes.json();

        setDates(availDates || []);
        setIsAdmin(adminData.isAdmin === true);

        const today = new Date().toISOString().split('T')[0];
        const startDate = availDates?.length > 0 ? availDates[0] : today;
        setSelectedDate(startDate);
      } catch (error) {
        console.error('Failed to init daily lessons:', error);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
    init();
  }, []);

  const fetchLessons = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-lessons?date=${date}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      setData({ date, lessons: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchLessons(selectedDate);
    }
  }, [selectedDate, fetchLessons]);

  const dateIndex = dates.indexOf(selectedDate);
  const canGoNewer = dateIndex > 0;
  const canGoOlder = dateIndex < dates.length - 1;

  function goNewer() {
    if (canGoNewer) setSelectedDate(dates[dateIndex - 1]);
  }
  function goOlder() {
    if (canGoOlder) setSelectedDate(dates[dateIndex + 1]);
  }

  async function handleTogglePin(lessonId, pin) {
    try {
      const profile = JSON.parse(localStorage.getItem('learner_profile') || '{}');
      const res = await fetch('/api/daily-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: pin ? 'pin' : 'unpin',
          date: selectedDate,
          lessonId,
          userEmail: profile.email || 'demo@housecallpro.com',
        }),
      });
      if (res.ok) {
        const { lessons } = await res.json();
        setData(prev => ({ ...prev, lessons }));
      }
    } catch (error) {
      console.error('Pin toggle failed:', error);
    }
  }

  const sortedLessons = data?.lessons
    ? [...data.lessons].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    : [];

  // Curate to the learner's experience level. Pinned lessons always show.
  // If filtering would leave nothing, fall back to showing all (never empty).
  const tier = profile?.tier;
  const allowedDifficulties = tier ? TIER_DIFFICULTIES[tier] : null;
  const tierFiltered = allowedDifficulties
    ? sortedLessons.filter(l => l.pinned || allowedDifficulties.includes(l.difficulty))
    : sortedLessons;
  const filterActive = !showAllLevels && allowedDifficulties && tierFiltered.length > 0;
  const visibleLessons = filterActive ? tierFiltered : sortedLessons;
  const hiddenCount = sortedLessons.length - visibleLessons.length;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={CalendarDays}
        title="Daily Lessons"
        subtitle="Fresh AI lessons every day, inspired by the latest developments"
      />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Date navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goOlder}
              disabled={!canGoOlder}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>

            <div className="text-center">
              <h2 className="text-lg font-bold text-ink dark:text-slate-200">
                {selectedDate ? formatDate(selectedDate) : 'Loading...'}
              </h2>
              {selectedDate && isToday(selectedDate) && (
                <span className="inline-flex items-center gap-1 text-xs text-brand font-medium mt-1">
                  <Sparkles className="w-3 h-3" /> Today
                </span>
              )}
            </div>

            <button
              onClick={goNewer}
              disabled={!canGoNewer}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {dates.length > 0 && (
            <div className="flex items-center justify-center gap-1 mt-3 overflow-x-auto">
              {dates.slice(0, 7).map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    d === selectedDate
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lessons */}
        {loading ? (
          <BookLoader message="Loading today's lessons..." />
        ) : visibleLessons.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-2">No lessons for this date</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {isToday(selectedDate)
                ? 'Daily lessons are generated each morning at 8:00 AM UTC. Check back soon!'
                : 'No lessons were generated for this date.'}
            </p>
            <Link
              href="/lesson"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              Start a custom lesson instead
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {visibleLessons.length} lesson{visibleLessons.length !== 1 ? 's' : ''}
                {filterActive && tier ? ` for your level (${TIER_LABELS[tier] || tier})` : ' for this day'}
              </p>
              {data?.generatedAt && (
                <p className="text-xs text-slate-400">
                  Generated {new Date(data.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
            {allowedDifficulties && (filterActive ? hiddenCount > 0 : tierFiltered.length > 0 && tierFiltered.length < sortedLessons.length) && (
              <button
                onClick={() => setShowAllLevels(prev => !prev)}
                className="text-xs font-medium text-brand hover:underline"
              >
                {filterActive
                  ? `Show all levels (${hiddenCount} more)`
                  : 'Show only my level'}
              </button>
            )}
            {visibleLessons.map(lesson => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                isAdmin={isAdmin}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
