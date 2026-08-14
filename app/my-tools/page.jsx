'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { useProfile } from '@/components/profile-provider';
import { useToolCatalog } from '@/components/tool-catalog-provider';
import { chosenTools, serializeTools, toolKey, normalizeTool, TOOL_CATEGORIES } from '@/lib/ai-tools';
import { PanelsTopLeft, Check, Plus, ExternalLink } from 'lucide-react';

// Dedicated page to manage the AI tool(s) the learner works in. Multi-select —
// pick every tool you have, and the coach picks the best one for each lesson's
// topic (and flags when a tool you don't have would fit better). Saved to the
// profile as `preferred_tools`.
export default function MyToolsPage() {
  return <CinematicFrame><MyToolsPageInner /></CinematicFrame>;
}

function MyToolsPageInner() {
  const { profile, updateProfile } = useProfile() || {};
  const { catalog } = useToolCatalog();
  const [set, setSet] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seed from the saved profile until the user starts editing (and re-seed
  // after a save, when `dirty` flips back to false).
  useEffect(() => {
    if (!dirty) setSet(chosenTools(profile));
  }, [profile, dirty]);

  const selectedKeys = new Set(set.map(toolKey));

  function toggle(choice) {
    const t = normalizeTool(choice);
    const key = toolKey(t);
    setDirty(true);
    setSaved(false);
    setSet((prev) => {
      const exists = prev.some((x) => toolKey(x) === key);
      // Allow deselecting everything — tools are opt-in, so an empty set is a
      // valid choice (the coach falls back to a default only for generation).
      if (exists) return prev.filter((x) => toolKey(x) !== key);
      return [...prev, t];
    });
  }

  async function addCustom() {
    const label = customLabel.trim();
    if (!label || adding) return;
    setCustomLabel('');
    setAdding(true);
    let extra = {};
    try {
      const res = await fetch('/api/tools/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label }),
      });
      if (res.ok) extra = await res.json();
    } catch {
      // fall back to just the name
    }
    toggle({ id: 'other', label, strengths: extra.strengths || null, url: extra.url || null, emoji: extra.emoji || null });
    setAdding(false);
  }

  function save() {
    updateProfile?.({ preferred_tools: serializeTools(set) });
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  // Catalog split into the same categories onboarding uses, with anything
  // uncategorised (an admin-added tool, say) falling into Specialist so it can
  // never vanish from the page. Tools the learner typed themselves get their own
  // group at the end, since they have no category to sort into.
  const customTools = set.filter((t) => t.id === 'other');
  const toolGroups = [
    ...TOOL_CATEGORIES.map((c) => ({
      ...c,
      items: catalog.filter((t) => (t.category || 'specialist') === c.id),
    })),
    { id: 'yours', label: 'Added by you', hint: '', items: customTools },
  ].filter((g) => g.items.length);

  return (
    <div className="min-h-screen">
      <PageHeader icon={PanelsTopLeft} title="My AI Tools" subtitle="The AI tools you work in, alongside the coach" />

      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            Pick every AI tool you have — choose as many as you use. You don&rsquo;t pick a single
            &ldquo;preferred&rdquo; tool here: for each lesson, the coach automatically chooses the best one
            of your tools for that topic (and flags when a tool you don&rsquo;t have yet would fit even better).
          </p>

          {/* Grouped by category, matching onboarding step 5 (feedback from Andrea:
              "I don't see multiple sets in my AI Tools section"). One flat list of a
              dozen tools makes Claude, Claude Code and Claude Cowork look like near
              duplicates, when the category is exactly what separates them — a chat
              assistant from an agent from an automation platform. Same grouping data
              (TOOL_CATEGORIES), so the two screens can't drift. */}
          <div className="space-y-5">
            {toolGroups.map((group) => (
              <div key={group.id}>
                <div className="px-1 mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{group.label}</p>
                  {group.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{group.hint}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((t) => (
                    <ToolRow
                      key={toolKey(t)}
                      tool={t}
                      selected={selectedKeys.has(toolKey(t))}
                      onToggle={() => toggle(t.id === 'other' ? t : t.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Plus className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="Add another tool (e.g. Perplexity)"
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand"
            />
            <button
              onClick={addCustom}
              disabled={!customLabel.trim() || adding}
              className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 text-sm font-medium disabled:opacity-40 transition-all"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={save}
              disabled={!dirty}
              className="px-6 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 transition-all"
            >
              Save my tools
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
            {set[0]?.url && (
              <a
                href={set[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand dark:text-brand-200 hover:underline"
              >
                Open {set[0].label}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ToolRow({ tool, selected, onToggle }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        selected
          ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
          selected ? 'bg-brand border-brand text-white' : 'border-slate-300 dark:border-slate-600'
        }`}>
          {selected && <Check className="w-3.5 h-3.5" />}
        </span>
        <span className="text-xl shrink-0">{tool.emoji}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink dark:text-slate-200">{tool.label}</span>
          {tool.strengths && (
            <span className="block text-xs text-slate-500 dark:text-slate-400">Best for {tool.strengths}</span>
          )}
        </span>
      </button>
    </div>
  );
}
