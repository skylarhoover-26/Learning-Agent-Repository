'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '../../../components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  Search,
  Zap,
  Gamepad2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Filter,
  BarChart3,
  User,
  Calendar,
  ArrowLeft,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import BookLoader from '@/components/book-loader';

const TYPE_CONFIG = {
  chat: { label: 'Chat', icon: MessageSquare, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  lesson_start: { label: 'Lesson Start', icon: BookOpen, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  lesson_continue: { label: 'Lesson', icon: BookOpen, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  lesson_complete: { label: 'Lesson Done', icon: GraduationCap, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  discover: { label: 'Discover', icon: Search, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  grade: { label: 'Grade', icon: GraduationCap, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  tones: { label: 'Tones', icon: MessageSquare, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' },
  quick_win: { label: 'Quick Win', icon: Zap, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  score_prompt: { label: 'Prompt Score', icon: Gamepad2, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
  scoring: { label: 'Scoring', icon: BarChart3, color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
  discuss: { label: 'Discussion', icon: MessageSquare, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' },
  page_visit: { label: 'Page Visit', icon: Activity, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  onboarding_complete: { label: 'Onboarded', icon: GraduationCap, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  section_read: { label: 'Section Read', icon: BookOpen, color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' },
  quiz_attempt: { label: 'Quiz', icon: Gamepad2, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
  module_complete: { label: 'Module Done', icon: GraduationCap, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  xp_earned: { label: 'XP', icon: Zap, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  badge_earned: { label: 'Badge', icon: GraduationCap, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  quest_complete: { label: 'Quest Done', icon: Zap, color: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400' },
  review_card: { label: 'Review', icon: BookOpen, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { label: type, icon: Activity, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
}

function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  } catch {
    return 'Unknown';
  }
}

function formatDuration(ms) {
  if (!ms || ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function JsonBlock({ data, label }) {
  if (!data) return <span className="text-slate-400 dark:text-slate-500 italic text-sm">No data</span>;

  return (
    <div>
      {label && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>}
      <pre className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function EntryCard({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const config = getTypeConfig(entry.type);
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </div>

        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.color}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm text-ink dark:text-slate-200 font-medium truncate block">
            {getEntrySummary(entry)}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {entry.error && (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
              Error
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(entry.durationMs)}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <User className="w-3 h-3" />
            {entry.user?.name || entry.user?.email || 'Unknown'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Endpoint</span>
              <p className="text-ink dark:text-slate-200 font-mono mt-0.5">{entry.endpoint}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Model</span>
              <p className="text-ink dark:text-slate-200 font-mono mt-0.5">{entry.model}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">User</span>
              <p className="text-ink dark:text-slate-200 mt-0.5">{entry.user?.email || 'unknown'}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Duration</span>
              <p className="text-ink dark:text-slate-200 mt-0.5">{formatDuration(entry.durationMs)}</p>
            </div>
          </div>

          {entry.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Error
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">{entry.error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <JsonBlock data={entry.input} label="Input (what was sent)" />
            <JsonBlock data={entry.output} label="Output (what came back)" />
          </div>
        </div>
      )}
    </div>
  );
}

function getEntrySummary(entry) {
  try {
    const { type, input, output } = entry;

    if (type === 'chat') {
      return input?.userMessage
        ? `"${truncate(input.userMessage, 80)}"`
        : 'Chat message';
    }
    if (type === 'lesson_start') {
      return `Started: ${input?.topic || 'Unknown topic'} (${input?.format || 'standard'})`;
    }
    if (type === 'lesson_continue') {
      return input?.userInput
        ? `"${truncate(input.userInput, 60)}" — Phase: ${output?.phase || input?.phase || '?'}`
        : `Lesson continue — Phase: ${output?.phase || '?'}`;
    }
    if (type === 'discover') {
      return input?.workDescription
        ? `"${truncate(input.workDescription, 80)}"`
        : 'Discovery search';
    }
    if (type === 'grade') {
      const score = output?.score;
      return `Graded: ${score !== undefined ? score + '/100' : 'N/A'} — "${truncate(input?.learnerResponse || '', 60)}"`;
    }
    if (type === 'quick_win') {
      return output?.title || input?.task || 'Quick win generated';
    }
    if (type === 'score_prompt') {
      return input?.scenario ? `Scenario: "${truncate(input.scenario, 60)}"` : 'Prompt scored';
    }
    if (type === 'scoring') {
      return `${input?.dimension || 'unknown'} dimension — Score: ${output?.score || '?'}`;
    }
    if (type === 'discuss') {
      return input?.userMessage ? `"${truncate(input.userMessage, 80)}"` : 'Quiz discussion';
    }
    if (type === 'tones') {
      return `Tone variants for: "${truncate(input?.sourceText || '', 60)}"`;
    }
    if (type === 'page_visit') {
      return `Visited: ${input?.page || input?.path || 'unknown page'}`;
    }
    if (type === 'onboarding_complete') {
      return `Onboarding complete — ${input?.department || 'unknown dept'}, ${input?.tier || 'unknown tier'}`;
    }
    if (type === 'lesson_complete') {
      return `Finished lesson: ${input?.topic || 'unknown'} (${input?.format || 'standard'})`;
    }
    if (type === 'section_read') {
      return `Read: ${input?.sectionTitle || 'section'} in Module ${input?.moduleNum || '?'}`;
    }
    if (type === 'quiz_attempt') {
      return `Quiz ${input?.isCorrect ? 'correct' : 'wrong'} — Module ${input?.moduleNum || '?'} (attempt ${input?.attempt || '?'}/${input?.maxAttempts || 3})`;
    }
    if (type === 'module_complete') {
      return `Completed Module ${input?.moduleNum || '?'}: ${input?.moduleTitle || ''}`;
    }
    if (type === 'xp_earned') {
      return `+${input?.amount || 0} XP — ${input?.source || 'unknown'}`;
    }
    if (type === 'badge_earned') {
      return `Earned badge: ${input?.badgeId || 'unknown'}`;
    }
    if (type === 'quest_complete') {
      return `Completed quest: ${input?.questTitle || 'unknown'} (+${input?.xpReward || 0} XP)`;
    }
    return entry.endpoint || 'Activity';
  } catch {
    return 'AI interaction';
  }
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function StatsCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-ink dark:text-slate-200">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ActivityLogPage() {
  return <CinematicFrame><ActivityLogPageInner /></CinematicFrame>;
}

function ActivityLogPageInner() {
  const router = useRouter();
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [entries, setEntries] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  // Default to real AI interactions — page visits are navigation noise and are
  // shown only when explicitly filtered to.
  const [selectedType, setSelectedType] = useState('ai');
  // Prefill from ?user=<email> so a link from Reporting can deep-link straight
  // to one person's activity, without needing a Suspense-wrapped searchParams hook.
  const [userFilter, setUserFilter] = useState(() =>
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('user') || '' : ''
  );

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin-check');
        const { isAdmin: admin } = await res.json();
        setIsAdmin(admin);
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminChecked(true);
      }
    }
    checkAdmin();
  }, []);

  const fetchDates = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-log?action=dates');
      const data = await res.json();
      setDates(data.dates || []);
      if (!selectedDate && data.dates?.length > 0) {
        setSelectedDate(data.dates[0].date);
      }
    } catch {
      setDates([]);
    }
  }, [selectedDate]);

  const fetchEntries = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate, type: selectedType });
      if (userFilter) params.set('user', userFilter);

      const entriesRes = await fetch(`/api/audit-log?${params}`);
      const entriesData = await entriesRes.json();
      setEntries(entriesData.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedType, userFilter]);

  // Header stats are computed from exactly what's shown, so the numbers always
  // match the current filter (rather than the whole day's raw totals).
  const stats = useMemo(() => {
    const byType = {};
    const byUser = {};
    let totalDuration = 0;
    let errorCount = 0;
    for (const e of entries) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      const email = e.user?.email || 'unknown';
      byUser[email] = (byUser[email] || 0) + 1;
      totalDuration += e.durationMs || 0;
      if (e.error) errorCount++;
    }
    return {
      total: entries.length,
      byType,
      byUser,
      avgDurationMs: entries.length ? Math.round(totalDuration / entries.length) : 0,
      errorCount,
    };
  }, [entries]);

  useEffect(() => {
    if (adminChecked && isAdmin) {
      fetchDates();
    }
  }, [adminChecked, isAdmin, fetchDates]);

  useEffect(() => {
    if (selectedDate && isAdmin) {
      fetchEntries();
    }
  }, [selectedDate, selectedType, userFilter, isAdmin, fetchEntries]);

  if (!adminChecked) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  const dateIndex = dates.findIndex((d) => d.date === selectedDate);
  const canGoNewer = dateIndex > 0;
  const canGoOlder = dateIndex < dates.length - 1;

  const uniqueTypes = [...new Set(entries.map((e) => e.type))];
  const uniqueUsers = [...new Set(entries.map((e) => e.user?.email).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader
        icon={Activity}
        title="Activity Log"
        subtitle="QA review of all AI interactions"
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4 text-sm text-slate-600 dark:text-slate-300">
          Every AI interaction in the app — chat, lesson steps, grading, discovery, prompt scoring,
          and more — is recorded here with the exact input sent to the model and the output it
          returned, so you can QA what the AI is actually doing. Showing <span className="font-semibold">AI interactions</span> by
          default; switch the type filter to <span className="font-semibold">Page Visit</span> or{' '}
          <span className="font-semibold">Everything</span> to include navigation.
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatsCard label="Total" value={stats.total} icon={Activity} />
            <StatsCard
              label="Avg Response"
              value={formatDuration(stats.avgDurationMs)}
              icon={Clock}
            />
            <StatsCard
              label="Errors"
              value={stats.errorCount}
              sub={stats.total > 0 ? `${((stats.errorCount / stats.total) * 100).toFixed(0)}% rate` : ''}
              icon={AlertTriangle}
            />
            <StatsCard
              label="Users"
              value={Object.keys(stats.byUser).length}
              icon={User}
            />
            <StatsCard
              label="Types"
              value={Object.keys(stats.byType).length}
              sub={Object.entries(stats.byType).map(([k, v]) => `${getTypeConfig(k).label}: ${v}`).join(', ')}
              icon={Filter}
            />
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => canGoNewer && setSelectedDate(dates[dateIndex - 1].date)}
                disabled={!canGoNewer}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-medium text-ink dark:text-slate-200 bg-transparent border-none focus:ring-0 cursor-pointer"
              >
                {dates.map((d) => (
                  <option key={d.date} value={d.date}>
                    {formatDate(d.date)}
                  </option>
                ))}
                {dates.length === 0 && (
                  <option value="">No logs yet</option>
                )}
              </select>
              <button
                onClick={() => canGoOlder && setSelectedDate(dates[dateIndex + 1].date)}
                disabled={!canGoOlder}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-sm text-ink dark:text-slate-200 bg-transparent border-none focus:ring-0 cursor-pointer"
              >
                <option value="ai">AI interactions</option>
                <option value="all">Everything (incl. page visits)</option>
                {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-1 flex-1 min-w-[160px] max-w-[260px]">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Filter by user..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="text-sm text-ink dark:text-slate-200 bg-transparent border-none focus:ring-0 placeholder:text-slate-400 w-full"
              />
              {userFilter && (
                <button onClick={() => setUserFilter('')} className="flex-shrink-0">
                  <XCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            <div className="ml-auto">
              <button
                onClick={fetchEntries}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <BookLoader message="Loading activity entries..." />
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-12 text-center">
            <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {dates.length === 0
                ? 'No activity logs yet. Logs will appear here once users interact with the AI features.'
                : 'No entries match your filters for this date.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              {selectedType === 'ai' ? ' (AI interactions)' : selectedType !== 'all' ? ` (${getTypeConfig(selectedType).label})` : ''}
            </p>
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
