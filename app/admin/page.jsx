'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '../../components/page-header';
import {
  Shield,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Edit3,
  ExternalLink,
  AlertTriangle,
  Clock,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  BookOpen,
  GripVertical,
  Loader2,
} from 'lucide-react';
import {
  getCuratedLessons,
  saveCuratedLesson,
  deleteCuratedLesson,
} from '@/lib/curated-lessons';

const INITIAL_PROPOSALS = [
  {
    id: 1,
    status: 'pending',
    type: 'NEW MODULE',
    typeBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    borderColor: 'border-l-blue-500',
    title: 'Claude 4 Tool Use Patterns',
    severity: 'High',
    confidence: 92,
    summary:
      'Claude 4 introduced a new tool_use API pattern that replaces the old function-calling approach. This affects 3 existing lessons in the AI Agents track.',
    sources: [
      { label: 'Anthropic Blog (May 26)', url: '#' },
      { label: 'API Changelog (May 25)', url: '#' },
    ],
    affects: ['AI Agents & Tools'],
    changes: { added: 2, edited: 4, removed: 0 },
  },
  {
    id: 2,
    status: 'pending',
    type: 'CONTENT UPDATE',
    typeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    borderColor: 'border-l-amber-500',
    title: 'Updated GPT-5 Reasoning Parameters',
    severity: 'Medium',
    confidence: 87,
    summary:
      "OpenAI's reasoning_effort parameter now accepts 'low'/'medium'/'high' instead of numeric values. Two prompt-writing lessons need updating.",
    sources: [{ label: 'OpenAI Docs (May 24)', url: '#' }],
    affects: ['Prompt Basics', 'Customer Communications'],
    changes: { added: 0, edited: 6, removed: 0 },
  },
  {
    id: 3,
    status: 'pending',
    type: 'DEPRECATION',
    typeBg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    borderColor: 'border-l-red-500',
    title: 'Remove Legacy Completions API References',
    severity: 'Low',
    confidence: 95,
    summary:
      'The completions endpoint was officially deprecated. 1 lesson still references it.',
    sources: [{ label: 'OpenAI Blog (May 20)', url: '#' }],
    affects: ['System Prompts'],
    changes: { added: 0, edited: 2, removed: 1 },
  },
  {
    id: 4,
    status: 'pending',
    type: 'NEW MODULE',
    typeBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    borderColor: 'border-l-blue-500',
    title: 'NIST AI Safety Framework for Enterprise',
    severity: 'Medium',
    confidence: 78,
    summary:
      'NIST released updated AI safety guidelines relevant to enterprise deployments. Proposes a new safety module.',
    sources: [
      { label: 'NIST.gov (May 22)', url: '#' },
      { label: 'The Batch (May 23)', url: '#' },
    ],
    affects: ['Safety'],
    changes: { added: 1, edited: 0, removed: 0 },
    changesNote: '+1 new module with 3 lessons',
  },
  {
    id: 5,
    status: 'approved',
    type: 'CONTENT UPDATE',
    typeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    borderColor: 'border-l-amber-500',
    title: 'MCP Server Setup Guide v2',
    severity: 'Medium',
    confidence: 90,
    summary: 'Updated to reflect new MCP protocol changes.',
    sources: [],
    affects: [],
    changes: { added: 0, edited: 0, removed: 0 },
    decidedBy: 'Skylar H.',
    decidedAgo: '1 day ago',
  },
  {
    id: 6,
    status: 'rejected',
    type: 'NEW MODULE',
    typeBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    borderColor: 'border-l-blue-500',
    title: 'Comparison of AI Code Editors',
    severity: 'Low',
    confidence: 65,
    summary: 'Proposed a comparison module covering popular AI code editors.',
    sources: [],
    affects: [],
    changes: { added: 0, edited: 0, removed: 0 },
    decidedBy: 'Bridget L.',
    decidedAgo: '2 days ago',
    rejectReason:
      'Too vendor-specific. Would need significant rework to be neutral.',
  },
];

const SEVERITY_STYLES = {
  High: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  Medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  Low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function countByStatus(proposals, status) {
  if (status === 'all') return proposals.length;
  return proposals.filter((p) => p.status === status).length;
}

function ChangesSummary({ changes, changesNote }) {
  if (changesNote) return <span className="text-sm text-slate-500 dark:text-slate-400">{changesNote}</span>;
  const parts = [];
  if (changes.added > 0) parts.push(`+${changes.added} added`);
  if (changes.edited > 0) parts.push(`~${changes.edited} edited`);
  if (changes.removed > 0) parts.push(`-${changes.removed} removed`);
  if (parts.length === 0) return null;
  return <span className="text-sm text-slate-500 dark:text-slate-400">{parts.join(', ')}</span>;
}

function Toast({ message, onDone }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <CheckCircle className="w-4 h-4 text-green-400" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function ProposalCard({ proposal, onAction }) {
  const [confirming, setConfirming] = useState(null);
  const isPending = proposal.status === 'pending';
  const isApproved = proposal.status === 'approved';
  const isRejected = proposal.status === 'rejected';

  const handleAction = useCallback(
    (action) => {
      if (confirming === action) {
        onAction(proposal.id, action);
        setConfirming(null);
      } else {
        setConfirming(action);
      }
    },
    [confirming, onAction, proposal.id]
  );

  const cardClasses = [
    'bg-white dark:bg-slate-800 rounded-lg shadow-card border-l-4 p-5 transition-all duration-300',
    proposal.borderColor,
    isApproved && 'opacity-75',
    isRejected && 'opacity-60',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${proposal.typeBg}`}>
          {proposal.type}
        </span>
        {isPending && (
          <>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_STYLES[proposal.severity]}`}>
              {proposal.severity}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {proposal.confidence}% confidence
            </span>
          </>
        )}
      </div>

      <h3 className={`text-lg font-bold text-ink dark:text-slate-200 mb-1 ${isRejected ? 'line-through' : ''}`}>
        {proposal.title}
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{proposal.summary}</p>

      {isPending && proposal.sources.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-ink/70 dark:text-slate-300/70 mr-1">Sources:</span>
          {proposal.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              className="text-xs text-brand hover:underline inline-flex items-center gap-0.5 mr-2"
            >
              {s.label}
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      )}

      {isPending && proposal.affects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-xs font-semibold text-ink/70 dark:text-slate-300/70">Affects:</span>
          {proposal.affects.map((a) => (
            <span key={a} className="text-xs bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 px-2 py-0.5 rounded-full">
              {a}
            </span>
          ))}
        </div>
      )}

      {isPending && (
        <div className="mb-3">
          <ChangesSummary changes={proposal.changes} changesNote={proposal.changesNote} />
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          {confirming === 'approve' ? (
            <button
              onClick={() => handleAction('approve')}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Confirm Approve
            </button>
          ) : (
            <button
              onClick={() => handleAction('approve')}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
          )}
          {confirming === 'reject' ? (
            <button
              onClick={() => handleAction('reject')}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Confirm Reject
            </button>
          ) : (
            <button
              onClick={() => handleAction('reject')}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          )}
          <button className="text-sm font-medium px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 transition-colors flex items-center gap-1">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          {confirming && (
            <button
              onClick={() => setConfirming(null)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-ink dark:text-slate-200 ml-1"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {isApproved && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 pt-2 border-t border-slate-200 dark:border-slate-700">
          <CheckCircle className="w-4 h-4" />
          <span>Approved by {proposal.decidedBy} — {proposal.decidedAgo}</span>
        </div>
      )}

      {isRejected && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span>Rejected by {proposal.decidedBy} — {proposal.decidedAgo}</span>
          </div>
          {proposal.rejectReason && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic ml-6">
              &ldquo;{proposal.rejectReason}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson Builder
// ---------------------------------------------------------------------------

const EMPTY_SLIDE = { slideTitle: '', message: '', keyPoints: [''] };

function LessonBuilder({ editingLesson, onSave, onCancel }) {
  const [topic, setTopic] = useState(editingLesson?.topic || '');
  const [format, setFormat] = useState(editingLesson?.format || 'standard');
  const [slides, setSlides] = useState(
    editingLesson?.slides?.length > 0
      ? editingLesson.slides
      : [{ ...EMPTY_SLIDE }]
  );

  function updateSlide(idx, field, value) {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  function updateKeyPoint(slideIdx, kpIdx, value) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIdx
          ? { ...s, keyPoints: s.keyPoints.map((kp, j) => (j === kpIdx ? value : kp)) }
          : s
      )
    );
  }

  function addKeyPoint(slideIdx) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIdx ? { ...s, keyPoints: [...s.keyPoints, ''] } : s
      )
    );
  }

  function removeKeyPoint(slideIdx, kpIdx) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIdx
          ? { ...s, keyPoints: s.keyPoints.filter((_, j) => j !== kpIdx) }
          : s
      )
    );
  }

  function addSlide() {
    setSlides((prev) => [...prev, { ...EMPTY_SLIDE, keyPoints: [''] }]);
  }

  function removeSlide(idx) {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    const cleanSlides = slides
      .filter((s) => s.slideTitle.trim() || s.message.trim())
      .map((s, idx) => ({
        slideTitle: s.slideTitle.trim(),
        message: s.message.trim(),
        keyPoints: s.keyPoints.filter((kp) => kp.trim()),
        phase: idx === 0 ? 'intro' : idx === slides.length - 1 ? 'complete' : 'steps',
        buttons: [],
      }));

    if (cleanSlides.length === 0) return;

    const lastSlide = cleanSlides[cleanSlides.length - 1];
    lastSlide.phase = 'complete';
    lastSlide.recap = {
      topic: topic.trim(),
      keyPoints: cleanSlides.flatMap((s) => s.keyPoints).slice(0, 5),
      applyTip: 'Try applying what you learned to a real task today.',
    };

    onSave({
      id: editingLesson?.id,
      topic: topic.trim(),
      format,
      slides: cleanSlides,
      createdAt: editingLesson?.createdAt,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-ink dark:text-slate-200">
          {editingLesson ? 'Edit Lesson' : 'Create Curated Lesson'}
        </h3>

        <div>
          <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-1">
            Lesson Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Writing Effective AI Prompts for Customer Service"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-1">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
          >
            <option value="quick_tip">Quick Tip (60 sec)</option>
            <option value="standard">Quick Lesson (3-5 min)</option>
            <option value="deep_dive">Deep Dive (15-20 min)</option>
          </select>
        </div>
      </div>

      {slides.map((slide, sIdx) => (
        <div
          key={sIdx}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-slate-300" />
              <h4 className="text-sm font-semibold text-ink dark:text-slate-300 uppercase tracking-wide">
                Slide {sIdx + 1}
              </h4>
            </div>
            {slides.length > 1 && (
              <button
                type="button"
                onClick={() => removeSlide(sIdx)}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-1">
              Slide Title
            </label>
            <input
              type="text"
              value={slide.slideTitle}
              onChange={(e) => updateSlide(sIdx, 'slideTitle', e.target.value)}
              placeholder="e.g., What is the RCTF Framework?"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-1">
              Content (supports **bold**, `code`, bullet lists)
            </label>
            <textarea
              value={slide.message}
              onChange={(e) => updateSlide(sIdx, 'message', e.target.value)}
              placeholder="Write your lesson content here..."
              rows={6}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-1">
              Key Points
            </label>
            <div className="space-y-2">
              {slide.keyPoints.map((kp, kpIdx) => (
                <div key={kpIdx} className="flex gap-2">
                  <input
                    type="text"
                    value={kp}
                    onChange={(e) => updateKeyPoint(sIdx, kpIdx, e.target.value)}
                    placeholder={`Key point ${kpIdx + 1}`}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
                  />
                  {slide.keyPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKeyPoint(sIdx, kpIdx)}
                      className="p-2 text-slate-400 hover:text-red-500"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addKeyPoint(sIdx)}
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add key point
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSlide}
        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Slide
      </button>

      <div className="flex gap-3">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-600 transition-all"
        >
          {editingLesson ? 'Update Lesson' : 'Publish Lesson'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CuratedLessonsList({ lessons, onEdit, onDelete, onCreate }) {
  if (lessons.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-12 text-center">
        <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-ink dark:text-slate-300 font-medium mb-1">No curated lessons yet</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-4">
          Create hand-crafted lessons that appear on the lesson picker alongside AI-generated ones.
        </p>
        <button
          onClick={onCreate}
          className="px-5 py-2.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-600 transition-all inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create First Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <div
          key={lesson.id}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-5 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand">
                {lesson.format === 'quick_tip'
                  ? 'Quick Tip'
                  : lesson.format === 'deep_dive'
                    ? 'Deep Dive'
                    : 'Quick Lesson'}
              </span>
              <span className="text-xs text-slate-400">
                {lesson.slides?.length || 0} slide{(lesson.slides?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <h4 className="font-bold text-ink dark:text-slate-200 truncate">{lesson.topic}</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Created {new Date(lesson.createdAt).toLocaleDateString()}
              {lesson.updatedAt !== lesson.createdAt &&
                ` · Updated ${new Date(lesson.updatedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(lesson)}
              className="p-2 rounded-lg text-slate-400 hover:text-brand hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all"
              title="Edit"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(lesson.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Dashboard
// ---------------------------------------------------------------------------

const ADMIN_VIEWS = [
  { key: 'proposals', label: 'Proposals', icon: FileText },
  { key: 'lessons', label: 'Curated Lessons', icon: BookOpen },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [proposals, setProposals] = useState(INITIAL_PROPOSALS);
  const [activeTab, setActiveTab] = useState('all');
  const [toast, setToast] = useState(null);
  const [adminView, setAdminView] = useState('proposals');
  const [curatedLessons, setCuratedLessons] = useState([]);
  const [editorState, setEditorState] = useState(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    setCuratedLessons(getCuratedLessons());
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAction = useCallback(
    (id, action) => {
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: action === 'approve' ? 'approved' : 'rejected',
            decidedBy: 'You',
            decidedAgo: 'just now',
            rejectReason:
              action === 'reject' ? 'Rejected by admin.' : undefined,
          };
        })
      );
      showToast(
        action === 'approve'
          ? 'Proposal approved successfully'
          : 'Proposal rejected'
      );
    },
    [showToast]
  );

  if (!adminChecked) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  function handleSaveLesson(lesson) {
    const saved = saveCuratedLesson(lesson);
    setCuratedLessons(getCuratedLessons());
    setEditorState(null);
    showToast(lesson.id ? 'Lesson updated' : 'Lesson published');
  }

  function handleDeleteLesson(id) {
    deleteCuratedLesson(id);
    setCuratedLessons(getCuratedLessons());
    showToast('Lesson deleted');
  }

  const filtered =
    activeTab === 'all'
      ? proposals
      : proposals.filter((p) => p.status === activeTab);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader
        icon={Shield}
        title="Admin Dashboard"
        subtitle="Manage curriculum proposals and curated lessons"
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Admin View Switcher */}
        <div className="flex items-center gap-2">
          {ADMIN_VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => { setAdminView(v.key); setEditorState(null); }}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                adminView === v.key
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <v.icon className="w-4 h-4" />
              {v.label}
              {v.key === 'lessons' && curatedLessons.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  adminView === v.key ? 'bg-white/20' : 'bg-brand-50 dark:bg-brand-900/30 text-brand'
                }`}>
                  {curatedLessons.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Proposals View */}
        {adminView === 'proposals' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Pending
                </p>
                <p className="text-2xl font-bold text-ink dark:text-slate-200 mt-1">
                  {countByStatus(proposals, 'pending')}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Approved this week
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {countByStatus(proposals, 'approved')}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Rejected
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {countByStatus(proposals, 'rejected')}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Auto-scan status
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Last scan: 2 hours ago
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-card p-1">
              {TABS.map((tab) => {
                const count = countByStatus(proposals, tab.key);
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto flex items-center pr-2">
                <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-ink dark:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:bg-slate-700 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filtered.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onAction={handleAction}
                />
              ))}
              {filtered.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-12 text-center">
                  <AlertTriangle className="w-8 h-8 text-slate-500 dark:text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    No proposals in this category.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Curated Lessons View */}
        {adminView === 'lessons' && (
          <>
            {editorState ? (
              <LessonBuilder
                editingLesson={editorState === 'new' ? null : editorState}
                onSave={handleSaveLesson}
                onCancel={() => setEditorState(null)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-ink dark:text-slate-200">Curated Lessons</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Hand-crafted lessons that appear on the lesson picker. These are delivered as-is, without AI generation.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditorState('new')}
                    className="px-4 py-2.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-600 transition-all flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> New Lesson
                  </button>
                </div>
                <CuratedLessonsList
                  lessons={curatedLessons}
                  onEdit={(lesson) => setEditorState(lesson)}
                  onDelete={handleDeleteLesson}
                  onCreate={() => setEditorState('new')}
                />
              </>
            )}
          </>
        )}
      </main>

      {toast && <Toast message={toast} />}
    </div>
  );
}
