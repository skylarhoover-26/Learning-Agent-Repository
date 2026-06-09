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
  Loader2,
} from 'lucide-react';

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

export default function AdminDashboard() {
  const router = useRouter();
  const [proposals, setProposals] = useState(INITIAL_PROPOSALS);
  const [activeTab, setActiveTab] = useState('all');
  const [toast, setToast] = useState(null);
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
      </main>

      {toast && <Toast message={toast} />}
    </div>
  );
}
