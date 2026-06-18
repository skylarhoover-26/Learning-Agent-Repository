'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '../../components/page-header';
import Link from 'next/link';
import {
  Shield,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Clock,
  FileText,
  RefreshCw,
  Loader2,
  Activity,
  FlaskConical,
  Radar,
  SlidersHorizontal,
  Users,
  Zap,
} from 'lucide-react';
import BookLoader from '@/components/book-loader';

const TYPE_STYLES = {
  'NEW MODULE': {
    bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    border: 'border-l-blue-500',
  },
  'CONTENT UPDATE': {
    bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    border: 'border-l-amber-500',
  },
  DEPRECATION: {
    bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    border: 'border-l-red-500',
  },
};

const SEVERITY_STYLES = {
  high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  med: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
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

function timeAgo(isoStr) {
  if (!isoStr) return 'Unknown';
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Unknown';
  }
}

function Toast({ message }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <CheckCircle className="w-4 h-4 text-green-400" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function ProposalCard({ proposal, onAction, actionLoading }) {
  const [confirming, setConfirming] = useState(null);
  const isPending = proposal.status === 'pending';
  const isApproved = proposal.status === 'approved';
  const isRejected = proposal.status === 'rejected';

  const typeStyle = TYPE_STYLES[proposal.type] || TYPE_STYLES['CONTENT UPDATE'];
  const sevLabel = (proposal.severity || 'med').charAt(0).toUpperCase() + (proposal.severity || 'med').slice(1);
  const confidence = typeof proposal.confidence === 'number'
    ? proposal.confidence <= 1 ? Math.round(proposal.confidence * 100) : Math.round(proposal.confidence)
    : null;

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

  const sources = proposal.source_findings || [];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-card border-l-4 p-5 transition-all duration-300 ${typeStyle.border} ${isApproved ? 'opacity-75' : ''} ${isRejected ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeStyle.bg}`}>
          {proposal.type}
        </span>
        {isPending && (
          <>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_STYLES[proposal.severity] || SEVERITY_STYLES.med}`}>
              {sevLabel}
            </span>
            {confidence !== null && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {confidence}% confidence
              </span>
            )}
          </>
        )}
        {proposal.created_at && (
          <span className="text-xs text-slate-400 ml-auto">{timeAgo(proposal.created_at)}</span>
        )}
      </div>

      <h3 className={`text-lg font-bold text-ink dark:text-slate-200 mb-1 ${isRejected ? 'line-through' : ''}`}>
        {proposal.title}
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{proposal.summary}</p>

      {isPending && sources.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-ink/70 dark:text-slate-300/70 mr-1">Sources:</span>
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand hover:underline inline-flex items-center gap-0.5 mr-2"
            >
              {s.sourceName || s.title || 'Source'}
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      )}

      {isPending && (proposal.affects || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold text-ink/70 dark:text-slate-300/70">Affects:</span>
          {proposal.affects.map((a) => (
            <span key={a} className="text-xs bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 px-2 py-0.5 rounded-full">
              {a}
            </span>
          ))}
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          {confirming === 'approve' ? (
            <button
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Confirm Approve'}
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
              disabled={actionLoading}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Confirm Reject'}
            </button>
          ) : (
            <button
              onClick={() => handleAction('reject')}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          )}
          {confirming && (
            <button
              onClick={() => setConfirming(null)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 ml-1"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {isApproved && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 pt-2 border-t border-slate-200 dark:border-slate-700">
          <CheckCircle className="w-4 h-4" />
          <span>Approved by {proposal.decidedBy || 'Admin'} — {timeAgo(proposal.decidedAt)}</span>
        </div>
      )}

      {isRejected && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span>Rejected by {proposal.decidedBy || 'Admin'} — {timeAgo(proposal.decidedAt)}</span>
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

export default function AdminDashboard() {
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [findingsCount, setFindingsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [toast, setToast] = useState(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

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

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/curriculum/proposals');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProposals(data.proposals || []);
      setFindingsCount(data.findingsCount || 0);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminChecked && isAdmin) {
      fetchProposals();
    }
  }, [adminChecked, isAdmin, fetchProposals]);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAction = useCallback(
    async (id, action) => {
      setActionLoading(true);
      try {
        const res = await fetch('/api/curriculum/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action }),
        });
        if (!res.ok) throw new Error('Failed');
        setProposals((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              status: action === 'approve' ? 'approved' : 'rejected',
              decidedBy: 'You',
              decidedAt: new Date().toISOString(),
              rejectReason: action === 'reject' ? 'Rejected by admin' : undefined,
            };
          })
        );
        showToast(action === 'approve' ? 'Proposal approved' : 'Proposal rejected');
      } catch {
        showToast('Failed to save — try again');
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const handleScanNow = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/curriculum/scan-now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScanResult(data);
      if (data.newProposals > 0) {
        fetchProposals();
      }
      showToast(`Scan complete: ${data.newFindings || 0} new findings, ${data.newProposals || 0} proposals`);
    } catch (err) {
      setScanResult({ error: err.message });
      showToast('Scan failed — check console');
    } finally {
      setScanning(false);
    }
  }, [fetchProposals, showToast]);

  if (!adminChecked) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }

  if (!isAdmin) {
    router.replace('/');
    return null;
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
        subtitle="Manage curriculum proposals"
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <Link
          href="/admin/activity-log"
          className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">Activity Log — QA Review</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Review all AI interactions, inputs, and outputs across users</p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">People &amp; XP</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">See anyone&apos;s level, badges, lessons, and XP history — and grant or deduct XP</p>
          </div>
        </Link>

        <Link
          href="/admin/xp-rules"
          className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">XP &amp; Levels</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Reference: exactly what earns XP, daily caps, and the leveling curve</p>
          </div>
        </Link>

        <Link
          href="/admin/avatar-preview"
          className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">Avatar Catalog</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Contact sheet of every avatar item to review how each looks</p>
          </div>
        </Link>

        <Link
          href="/admin/lesson-preview"
          className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">Lesson Content Preview</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Generate and review what a lesson produces for any topic, by depth (60s → 15+ min)</p>
          </div>
        </Link>

        <Link
          href="/admin/skill-levels"
          className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">Skill Levels</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Set each AI skill&apos;s difficulty (beginner / intermediate / advanced) to control who gets recommended it</p>
          </div>
        </Link>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-ink dark:text-slate-200 mt-1">
              {countByStatus(proposals, 'pending')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {countByStatus(proposals, 'approved')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rejected</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {countByStatus(proposals, 'rejected')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sources tracked</p>
            <p className="text-2xl font-bold text-ink dark:text-slate-200 mt-1">{findingsCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">articles in index</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-slate-200 flex items-center gap-2">
                <Radar className="w-4 h-4 text-brand" />
                Curriculum Auto-Scan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Runs daily at 8:00 AM UTC. Scans 13 RSS feeds (OpenAI, Anthropic, Google, MIT Tech Review, etc.) for AI news, then proposes curriculum updates.
              </p>
            </div>
            <button
              onClick={handleScanNow}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4" />
                  Run scan now
                </>
              )}
            </button>
          </div>
          {scanResult && !scanResult.error && (
            <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm text-green-800 dark:text-green-300">
              Scan complete: {scanResult.newFindings || 0} new articles found, {scanResult.newProposals || 0} proposals generated, {scanResult.totalFindings || 0} total in index.
              {(scanResult.errors || []).length > 0 && (
                <span className="text-amber-700 dark:text-amber-400 ml-1">
                  ({scanResult.errors.length} feed{scanResult.errors.length !== 1 ? 's' : ''} had errors)
                </span>
              )}
            </div>
          )}
          {scanResult?.error && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-400">
              Scan failed: {scanResult.error}
            </div>
          )}
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
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
          <div className="ml-auto flex items-center pr-2">
            <button
              onClick={fetchProposals}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <BookLoader message="Loading proposals..." size="sm" />
        ) : (
          <div className="space-y-4">
            {filtered.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))}
            {filtered.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card p-12 text-center">
                <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {proposals.length === 0
                    ? 'No proposals yet. Run a scan to check for curriculum updates, or wait for the daily auto-scan at 8 AM UTC.'
                    : 'No proposals in this category.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {toast && <Toast message={toast} />}
    </div>
  );
}
