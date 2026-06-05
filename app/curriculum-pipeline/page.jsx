'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import {
  getFindings, saveFindings,
  getProposals, saveProposals, updateProposalStatus,
} from '@/lib/pipeline-store';
import {
  RefreshCw, Loader2, Check, X, ExternalLink,
  Zap, AlertTriangle, FileText, Trash2,
  ChevronDown, ChevronRight, Rss,
} from 'lucide-react';

const SEVERITY_STYLES = {
  high: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  med: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  low: 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200',
};

const TYPE_ICONS = {
  'NEW MODULE': Zap,
  'CONTENT UPDATE': FileText,
  'DEPRECATION': Trash2,
};

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
};

export default function CurriculumPipelinePage() {
  const router = useRouter();
  const [findings, setFindings] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [curating, setCurating] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [expandedProposal, setExpandedProposal] = useState(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAccessAndLoad() {
      try {
        const adminRes = await fetch('/api/admin-check');
        const { isAdmin: admin } = await adminRes.json();
        setIsAdmin(admin);
        setAdminChecked(true);
        if (!admin) return;
      } catch {
        setAdminChecked(true);
        return;
      }

      try {
        const [findingsRes, proposalsRes] = await Promise.all([
          fetch('/api/user-data?type=curriculum_findings'),
          fetch('/api/user-data?type=curriculum_proposals'),
        ]);
        const findingsData = findingsRes.ok ? (await findingsRes.json()).data : null;
        const proposalsData = proposalsRes.ok ? (await proposalsRes.json()).data : null;
        if (findingsData) {
          saveFindings(findingsData);
          setFindings(findingsData);
        } else {
          setFindings(getFindings());
        }
        if (proposalsData) {
          saveProposals(proposalsData);
          setProposals(proposalsData);
        } else {
          setProposals(getProposals());
        }
      } catch {
        setFindings(getFindings());
        setProposals(getProposals());
      }
    }
    checkAccessAndLoad();
  }, []);

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

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/curriculum/scan', { method: 'POST' });
      const data = await res.json();
      const result = saveFindings(data.findings);
      setFindings(getFindings());
      setScanResult({
        total: data.findings.length,
        new: result.new,
        errors: data.errors,
        scannedAt: data.scannedAt,
      });
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setScanning(false);
    }
  }

  async function handleCurate() {
    setCurating(true);
    try {
      const res = await fetch('/api/curriculum/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings: findings.slice(0, 30) }),
      });
      const data = await res.json();
      if (data.proposals?.length > 0) {
        saveProposals(data.proposals);
        setProposals(getProposals());
      }
    } catch (error) {
      console.error('Curate error:', error);
    } finally {
      setCurating(false);
    }
  }

  function handleProposalAction(proposalId, status) {
    const updated = updateProposalStatus(proposalId, status);
    setProposals(updated);
  }

  const pendingCount = proposals.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Rss}
        title="Curriculum Pipeline"
        subtitle="AI news sources are scanned daily — review and approve proposals"
      />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
          <Rss className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Sources are scanned automatically every day at 8am UTC</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              New findings are analyzed and turned into curriculum update proposals. You can also run a manual scan anytime.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-all"
          >
            {scanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Scan Sources</>
            )}
          </button>

          <button
            onClick={handleCurate}
            disabled={curating || findings.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cta text-ink font-semibold text-sm hover:bg-cta-600 disabled:opacity-50 transition-all"
          >
            {curating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Curating...</>
            ) : (
              <><Zap className="w-4 h-4" /> Generate Proposals</>
            )}
          </button>

          <div className="flex items-center gap-4 ml-auto text-sm text-slate-500 dark:text-slate-400">
            <span>{findings.length} findings</span>
            <span>{proposals.length} proposals ({pendingCount} pending)</span>
          </div>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            Found {scanResult.total} items ({scanResult.new} new).
            {scanResult.errors?.length > 0 && (
              <span className="text-amber-700 ml-2">
                {scanResult.errors.length} source(s) failed.
              </span>
            )}
          </div>
        )}

        {/* Proposals */}
        {proposals.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-4">Proposals</h2>
            <div className="space-y-3">
              {proposals.map(proposal => {
                const TypeIcon = TYPE_ICONS[proposal.type] || FileText;
                const isExpanded = expandedProposal === proposal.id;

                return (
                  <div
                    key={proposal.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                      <TypeIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-ink dark:text-slate-200 truncate">{proposal.title}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${SEVERITY_STYLES[proposal.severity] || ''}`}>
                            {proposal.severity}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_STYLES[proposal.status] || ''}`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{proposal.summary}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        <div className="pt-3 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Type</p>
                            <p className="text-sm text-ink dark:text-slate-200">{proposal.type}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Rationale</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{proposal.summary}</p>
                          </div>
                          {proposal.affects?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Affects</p>
                              <div className="flex flex-wrap gap-1">
                                {proposal.affects.map((a, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">{a}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {proposal.confidence && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Confidence</p>
                              <p className="text-sm text-ink dark:text-slate-200">{Math.round(proposal.confidence * 100)}%</p>
                            </div>
                          )}
                          {proposal.source_findings?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Sources</p>
                              <div className="space-y-1">
                                {proposal.source_findings.map((f, i) => (
                                  <a
                                    key={i}
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-brand hover:text-brand-600"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    [{f.sourceName}] {f.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {proposal.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleProposalAction(proposal.id, 'approved')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-all"
                              >
                                <Check className="w-4 h-4" /> Approve
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal.id, 'rejected')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-all"
                              >
                                <X className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Findings */}
        {findings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-4">Recent Findings</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card divide-y divide-slate-100 dark:divide-slate-700">
              {findings.slice(0, 20).map((finding, i) => (
                <div key={finding.externalId || i} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded shrink-0 mt-0.5">
                    {finding.sourceName}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={finding.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-ink dark:text-slate-200 hover:text-brand transition-colors line-clamp-1"
                    >
                      {finding.title}
                    </a>
                  </div>
                  <a
                    href={finding.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-brand shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
