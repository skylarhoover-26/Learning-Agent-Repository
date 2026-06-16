'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { useProfile } from '@/components/profile-provider';
import { AI_TOOLS, resolveTools, serializeTools, toolKey, normalizeTool } from '@/lib/ai-tools';
import { PanelsTopLeft, Check, Star, Plus, ExternalLink } from 'lucide-react';

// Dedicated page to manage the AI tool(s) the learner works in. Multi-select,
// with one "primary" (the tool the coach opens by default). Saved to the
// profile as `preferred_tools`.
export default function MyToolsPage() {
  const { profile, updateProfile } = useProfile() || {};
  const [set, setSet] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [saved, setSaved] = useState(false);

  // Seed from the saved profile until the user starts editing (and re-seed
  // after a save, when `dirty` flips back to false).
  useEffect(() => {
    if (!dirty) setSet(resolveTools(profile));
  }, [profile, dirty]);

  const selectedKeys = new Set(set.map(toolKey));

  function toggle(choice) {
    const t = normalizeTool(choice);
    const key = toolKey(t);
    setDirty(true);
    setSaved(false);
    setSet((prev) => {
      const exists = prev.some((x) => toolKey(x) === key);
      if (exists) {
        const next = prev.filter((x) => toolKey(x) !== key);
        return next.length ? next : prev; // keep at least one
      }
      return [...prev, t];
    });
  }

  function makePrimary(choice) {
    const t = normalizeTool(choice);
    const key = toolKey(t);
    setDirty(true);
    setSaved(false);
    setSet((prev) => [t, ...prev.filter((x) => toolKey(x) !== key)]);
  }

  function addCustom() {
    const label = customLabel.trim();
    if (!label) return;
    toggle({ id: 'other', label });
    setCustomLabel('');
  }

  function save() {
    updateProfile?.({ preferred_tools: serializeTools(set) });
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const primaryKey = set.length ? toolKey(set[0]) : null;
  const customTools = set.filter((t) => t.id === 'other');

  return (
    <div className="min-h-screen">
      <PageHeader icon={PanelsTopLeft} title="My AI Tools" subtitle="The AI tools you work in, alongside the coach" />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            Pick every AI tool you use — you can choose more than one. Lessons are tailored to your tools, and
            we&rsquo;ll flag when one fits a task better than another. Star the one you want us to open by default.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AI_TOOLS.map((t) => {
              const selected = selectedKeys.has(toolKey(t));
              const isPrimary = toolKey(t) === primaryKey;
              return (
                <ToolRow
                  key={t.id}
                  tool={t}
                  selected={selected}
                  isPrimary={isPrimary}
                  onToggle={() => toggle(t.id)}
                  onMakePrimary={() => makePrimary(t.id)}
                />
              );
            })}
          </div>

          {customTools.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {customTools.map((t) => (
                <ToolRow
                  key={toolKey(t)}
                  tool={t}
                  selected
                  isPrimary={toolKey(t) === primaryKey}
                  onToggle={() => toggle(t)}
                  onMakePrimary={() => makePrimary(t)}
                />
              ))}
            </div>
          )}

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
              disabled={!customLabel.trim()}
              className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 text-sm font-medium disabled:opacity-40 transition-all"
            >
              Add
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

function ToolRow({ tool, selected, isPrimary, onToggle, onMakePrimary }) {
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
          <span className="block font-semibold text-ink dark:text-slate-200 truncate">{tool.label}</span>
          {tool.strengths && (
            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">Best for {tool.strengths}</span>
          )}
        </span>
      </button>
      {selected && (
        <button
          onClick={onMakePrimary}
          title={isPrimary ? 'Primary tool' : 'Set as primary'}
          aria-label={isPrimary ? 'Primary tool' : 'Set as primary'}
          className="shrink-0 p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700"
        >
          <Star className={`w-4 h-4 ${isPrimary ? 'fill-cta text-cta' : 'text-slate-400'}`} />
        </button>
      )}
    </div>
  );
}
