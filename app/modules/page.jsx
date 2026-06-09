'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { useProfile } from '@/components/profile-provider';
import { getModulesForTier, getPersonalizedSubtitle } from '@/lib/modules-data';
import { trackModuleSectionRead, trackQuizAttempt, trackModuleComplete } from '@/lib/track';
import BookLoader from '@/components/book-loader';
import {
  getModuleProgress, isSectionRead, markSectionRead,
  saveQuizAnswer, markModuleComplete, resetQuizForRetry,
} from '@/lib/module-store';
import {
  GraduationCap, ChevronRight, ChevronLeft,
  Check, BookOpen, Zap, Wand2, Cog, BarChart3,
  ArrowRight, Play, RotateCcw, MessageCircle,
  Send, Loader2, Brain, Workflow, Code2, Users,
} from 'lucide-react';

const MODULE_ICONS = {
  1: BookOpen,
  2: Zap,
  3: Wand2,
  4: Cog,
  5: BarChart3,
  6: Brain,
  7: Workflow,
  8: Code2,
  9: Users,
};

const MAX_QUIZ_ATTEMPTS = 3;

export default function ModulesPage() {
  const { profile, isLoading: profileLoading } = useProfile();
  const [selectedModule, setSelectedModule] = useState(null);
  const [expandedSection, setExpandedSection] = useState(0);
  const [progressVersion, setProgressVersion] = useState(0);

  const tier = profile?.tier || 'beginner';
  const topTasks = profile?.top_tasks || [];
  const modules = getModulesForTier(tier);

  const refreshProgress = useCallback(() => {
    setProgressVersion((v) => v + 1);
  }, []);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader icon={GraduationCap} title="Learning Path" subtitle="Loading your personalized modules..." />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <BookLoader message="Loading your personalized modules..." />
        </main>
      </div>
    );
  }

  if (selectedModule !== null) {
    const mod = modules[selectedModule];
    if (!mod) {
      setSelectedModule(null);
      return null;
    }
    const displayNum = selectedModule + 1;
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader
          icon={GraduationCap}
          title={`Module ${displayNum}: ${mod.title}`}
          subtitle={getPersonalizedSubtitle(mod.num, topTasks) || mod.subtitle}
        />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <button
            onClick={() => { setSelectedModule(null); setExpandedSection(0); }}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> All modules
          </button>

          <ModuleDetail
            module={mod}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            onProgressChange={refreshProgress}
          />
        </main>
      </div>
    );
  }

  const tierLabel = {
    beginner: 'Beginner',
    practitioner: 'Practitioner',
    power_user: 'Power User',
    builder: 'Builder',
    developer: 'Developer',
  }[tier] || 'Beginner';

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={GraduationCap}
        title="Learning Path"
        subtitle={`${modules.length} modules tailored for ${tierLabel} level`}
      />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-4">
          {modules.map((mod, i) => {
            const Icon = MODULE_ICONS[mod.num] || BookOpen;
            const progress = progressVersion >= 0 ? getModuleProgress(mod.num) : null;
            const totalSections = mod.sections.length;
            const readCount = progress?.sectionsRead?.length || 0;
            const pct = totalSections > 0 ? Math.round((readCount / totalSections) * 100) : 0;
            const personalizedSub = getPersonalizedSubtitle(mod.num, topTasks);
            return (
              <button
                key={mod.num}
                onClick={() => setSelectedModule(i)}
                className="w-full group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card hover:border-brand-200 hover:shadow-card-hover p-6 transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white text-brand transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Module {i + 1}
                      </span>
                      <span className="text-xs text-slate-400">&middot; {mod.duration}</span>
                      {progress?.completed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          <Check className="w-3 h-3" /> Complete
                        </span>
                      )}
                      {!progress?.completed && readCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                          {pct}% In Progress
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-0.5 tracking-tight">{mod.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {personalizedSub || mod.subtitle}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ModuleDetail({ module: mod, expandedSection, setExpandedSection, onProgressChange }) {
  const [sectionReadState, setSectionReadState] = useState(() => {
    const initial = mod.sections.map((_, i) => isSectionRead(mod.num, i));
    if (!initial[0]) {
      markSectionRead(mod.num, 0);
      initial[0] = true;
      onProgressChange?.();
    }
    return initial;
  });

  function markRead(idx) {
    if (idx < 0 || idx >= mod.sections.length || sectionReadState[idx]) return;
    markSectionRead(mod.num, idx);
    trackModuleSectionRead(mod.num, mod.title, mod.sections[idx]?.title || `Section ${idx + 1}`);
    setSectionReadState((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
    onProgressChange?.();
  }

  function handleExpandSection(idx) {
    const willExpand = expandedSection !== idx;
    setExpandedSection(willExpand ? idx : -1);
    if (willExpand) markRead(idx);
  }

  function handleNextSection(currentIdx) {
    markRead(currentIdx);
    const nextIdx = currentIdx + 1;
    setExpandedSection(nextIdx);
    markRead(nextIdx);
  }

  const handleActivityDone = useCallback(() => {
    const allRead = mod.sections.every((_, i) => isSectionRead(mod.num, i));
    if (allRead) {
      markModuleComplete(mod.num);
      trackModuleComplete(mod.num, mod.title);
      onProgressChange?.();
    }
  }, [mod.num, mod.title, mod.sections, onProgressChange]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {mod.sections.map((section, i) => {
          const isExpanded = expandedSection === i;
          const isDone = sectionReadState[i];

          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden"
            >
              <button
                onClick={() => handleExpandSection(i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone
                    ? 'bg-green-100 text-green-700'
                    : isExpanded
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-sm font-semibold flex-1 ${isExpanded ? 'text-ink dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                  {section.title}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-10">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {section.content}
                    </p>
                    {section.action && (
                      <Link
                        href={section.action.href}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 transition-all"
                      >
                        {section.action.label}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleNextSection(i)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-600 transition-colors"
                      >
                        {i < mod.sections.length - 1 ? 'Next section' : 'Go to activity'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mod.activity && (
        <ActivityCard activity={mod.activity} moduleNum={mod.num} onActivityDone={handleActivityDone} />
      )}
    </div>
  );
}

function ActivityCard({ activity, moduleNum, onActivityDone }) {
  const storedProgress = getModuleProgress(moduleNum);
  const [selectedAnswer, setSelectedAnswer] = useState(storedProgress?.quizAnswer);
  const [showResult, setShowResult] = useState(storedProgress?.quizAnswer !== null && storedProgress?.quizAnswer !== undefined);
  const [attempts, setAttempts] = useState(storedProgress?.quizAttempts || 0);
  const [markedDone, setMarkedDone] = useState(storedProgress?.completed || false);
  const [showDiscussion, setShowDiscussion] = useState(false);

  const isCorrect = showResult && selectedAnswer === activity.correct;
  const outOfAttempts = showResult && !isCorrect && attempts >= MAX_QUIZ_ATTEMPTS;
  const canRetry = showResult && !isCorrect && attempts < MAX_QUIZ_ATTEMPTS;
  const revealAnswer = isCorrect || outOfAttempts;

  function handleQuizAnswer(answerIdx) {
    const newAttempts = attempts + 1;
    setSelectedAnswer(answerIdx);
    setShowResult(true);
    setAttempts(newAttempts);
    saveQuizAnswer(moduleNum, answerIdx);
    trackQuizAttempt(moduleNum, activity.title, answerIdx === activity.correct, newAttempts, MAX_QUIZ_ATTEMPTS);
    onActivityDone?.();
  }

  function handleRetry() {
    resetQuizForRetry(moduleNum);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowDiscussion(false);
  }

  if (activity.type === 'quiz') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-brand" />
          <h3 className="font-bold text-ink dark:text-slate-200">{activity.title}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{activity.question}</p>
        <div className="space-y-2 mb-4">
          {activity.options.map((opt, i) => {
            const isCorrectOpt = revealAnswer && i === activity.correct;
            const isWrong = showResult && selectedAnswer === i && i !== activity.correct;
            return (
              <button
                key={i}
                onClick={() => handleQuizAnswer(i)}
                disabled={showResult}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  isCorrectOpt
                    ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                    : isWrong
                    ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300'
                    : selectedAnswer === i
                    ? 'bg-brand-50 border-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-200 disabled:opacity-60'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {showResult && canRetry && (
          <div className="rounded-xl p-4 text-sm bg-amber-50 border border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
            Not quite — give it another shot. ({MAX_QUIZ_ATTEMPTS - attempts} {MAX_QUIZ_ATTEMPTS - attempts === 1 ? 'try' : 'tries'} left)
          </div>
        )}

        {revealAnswer && (
          <div className={`rounded-xl p-4 text-sm ${
            isCorrect
              ? 'bg-green-50 border border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-amber-50 border border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
          }`}>
            {activity.explanation}
          </div>
        )}

        {showResult && (
          <div className="flex items-center gap-3 mt-4">
            {canRetry && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-pill border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try again ({MAX_QUIZ_ATTEMPTS - attempts} left)
              </button>
            )}
            {outOfAttempts && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                No retries remaining
              </span>
            )}
            {revealAnswer && (
              <button
                onClick={() => setShowDiscussion(!showDiscussion)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {showDiscussion ? 'Hide discussion' : 'Ask about this'}
              </button>
            )}
          </div>
        )}

        {showDiscussion && (
          <QuizDiscussion
            quizContext={{
              question: activity.question,
              options: activity.options,
              correct: activity.correct,
              userAnswer: selectedAnswer,
              explanation: activity.explanation,
            }}
          />
        )}
      </div>
    );
  }

  if (activity.type === 'action' || activity.type === 'build') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-brand" />
          <h3 className="font-bold text-ink dark:text-slate-200">{activity.title}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{activity.description}</p>
        {activity.steps && (
          <ol className="space-y-2 mb-4">
            {activity.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}
        <div className="flex items-center gap-3 mt-4">
          {activity.action && (
            <Link
              href={activity.action.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
            >
              {activity.action.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {markedDone ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-green-100 text-green-700 text-sm font-semibold">
              <Check className="w-4 h-4" /> Module complete
            </span>
          ) : (
            <button
              onClick={() => { setMarkedDone(true); onActivityDone?.(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
            >
              <Check className="w-4 h-4" /> Mark as complete
            </button>
          )}
        </div>
      </div>
    );
  }

  if (activity.type === 'reflect') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-brand" />
          <h3 className="font-bold text-ink dark:text-slate-200">{activity.title}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{activity.description}</p>
        <div className="space-y-3">
          {activity.questions.map((q, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm font-medium text-ink dark:text-slate-200 mb-2">{i + 1}. {q}</p>
              <textarea
                placeholder="Your answer..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-none"
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          {markedDone ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-green-100 text-green-700 text-sm font-semibold">
              <Check className="w-4 h-4" /> Module complete
            </span>
          ) : (
            <button
              onClick={() => { setMarkedDone(true); onActivityDone?.(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
            >
              <Check className="w-4 h-4" /> Mark as complete
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function renderInlineMarkdown(text) {
  if (!text) return text;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      parts.push(<strong key={`b-${match.index}`} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={`c-${match.index}`} className="bg-slate-200/60 dark:bg-slate-600/60 px-1 py-0.5 rounded text-[13px] font-mono">{match[3]}</code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

function QuizDiscussion({ quizContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/modules/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizContext, messages: updatedMessages }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Try asking again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Ask a question about this answer
        </p>
      </div>

      <div ref={scrollRef} className="max-h-64 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Ask why an answer is right or wrong, request an example, or get more context.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'text-right'
                : 'text-left'
            }`}
          >
            <span
              className={`inline-block px-3 py-2 rounded-xl max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200'
              }`}
            >
              {msg.role === 'assistant' ? renderInlineMarkdown(msg.content) : msg.content}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why is that the right answer?"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-lg bg-brand text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
