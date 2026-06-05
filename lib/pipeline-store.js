import { saveToBlob } from './sync-store';

const FINDINGS_KEY = 'curriculum_findings';
const PROPOSALS_KEY = 'curriculum_proposals';

export function getFindings() {
  try {
    const raw = localStorage.getItem(FINDINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFindings(findings) {
  const existing = getFindings();
  const existingIds = new Set(existing.map(f => f.externalId));
  const newFindings = findings.filter(f => !existingIds.has(f.externalId));
  const merged = [...newFindings, ...existing].slice(0, 200);
  localStorage.setItem(FINDINGS_KEY, JSON.stringify(merged));
  saveToBlob(FINDINGS_KEY, merged);
  return { total: merged.length, new: newFindings.length };
}

export function getProposals() {
  try {
    const raw = localStorage.getItem(PROPOSALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProposals(proposals) {
  const existing = getProposals();
  const merged = [...proposals, ...existing];
  localStorage.setItem(PROPOSALS_KEY, JSON.stringify(merged));
  saveToBlob(PROPOSALS_KEY, merged);
  return merged;
}

export function updateProposalStatus(proposalId, status) {
  const proposals = getProposals();
  const updated = proposals.map(p =>
    p.id === proposalId ? { ...p, status, reviewed_at: new Date().toISOString() } : p
  );
  localStorage.setItem(PROPOSALS_KEY, JSON.stringify(updated));
  saveToBlob(PROPOSALS_KEY, updated);
  return updated;
}
