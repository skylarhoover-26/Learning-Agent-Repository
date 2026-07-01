'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { getGoals, addGoal, completeGoal, deleteGoal } from '@/lib/goal-store';
import CinematicShell from '@/components/cinematic/cinematic-shell';

const GOAL_SUGGESTIONS = [
  { title: 'Write my first AI prompt using the RCTF framework', category: 'Prompting' },
  { title: 'Use AI to draft 3 emails this week', category: 'Productivity' },
  { title: 'Complete all 5 learning modules', category: 'Learning' },
  { title: 'Build a reusable prompt template for my weekly tasks', category: 'Prompting' },
  { title: 'Try all 4 AI games and beat my high score', category: 'Practice' },
  { title: 'Learn how to spot AI hallucinations', category: 'Safety' },
  { title: 'Create an AI workflow that saves me 30+ minutes a week', category: 'Productivity' },
  { title: 'Understand data privacy best practices for AI tools', category: 'Safety' },
  { title: 'Share a useful prompt with my team', category: 'Impact' },
  { title: 'Complete the calibration assessment', category: 'Learning' },
  { title: 'Reach Level 3 on the platform', category: 'Progress' },
  { title: 'Use AI to summarize a meeting or document', category: 'Productivity' },
];

const CAT_TINT = {
  Prompting: '#3B94FF', Productivity: '#1AA06A', Learning: '#A06AFF', Practice: '#FFB706',
  Safety: '#FF5A6E', Impact: '#FF8A3D', Progress: '#3B94FF',
};

export default function CinematicGoals() {
  const [goals, setGoals] = useState([]);
  const [customGoal, setCustomGoal] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setGoals(getGoals()); }, []);

  function handleAdd(title) {
    addGoal(title);
    setGoals(getGoals());
    setCustomGoal('');
    setShowForm(false);
  }
  function handleComplete(id) { completeGoal(id); setGoals(getGoals()); }
  function handleDelete(id) { deleteGoal(id); setGoals(getGoals()); }
  function handleSubmitCustom(e) { e.preventDefault(); const t = customGoal.trim(); if (t) handleAdd(t); }

  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  const usedTitles = new Set(goals.map((g) => g.title));
  const suggestions = GOAL_SUGGESTIONS.filter((s) => !usedTitles.has(s.title));

  return (
    <CinematicShell>
      <section className="cine-rise">
        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-3 cine-gold">
          <Target className="w-3.5 h-3.5" /> GOALS
        </span>
        <h1 className="font-display font-extrabold text-4xl">Your goals</h1>
        <p className="mt-2 text-base" style={{ color: 'var(--ink-dim)' }}>Set targets and track your AI learning progress.</p>
      </section>

      {active.length > 0 && (
        <section className="cine-rise">
          <h2 className="font-display font-bold mb-3">Active goals ({active.length})</h2>
          <div className="space-y-3">
            {active.map((goal) => (
              <div key={goal.id} className="cine-glass rounded-2xl p-4 flex items-center gap-4">
                <button onClick={() => handleComplete(goal.id)} aria-label="Mark complete"
                  className="cine-lift w-7 h-7 rounded-full grid place-items-center shrink-0 group" style={{ border: '2px solid var(--line)' }}>
                  <Check className="w-4 h-4 text-transparent group-hover:text-[var(--good)]" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{goal.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>Added {new Date(goal.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDelete(goal.id)} aria-label="Delete" className="cine-lift p-2 rounded-lg" style={{ color: 'var(--ink-dim)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="cine-rise">
        {showForm ? (
          <form onSubmit={handleSubmitCustom} className="cine-glass rounded-2xl p-6">
            <h3 className="font-display font-bold mb-3">Write your own goal</h3>
            <div className="flex gap-3">
              <input value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} autoFocus
                placeholder="e.g., Use AI to prep for my next QBR"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <button type="submit" disabled={!customGoal.trim()} className="cine-pill px-5 py-2.5 font-semibold text-sm disabled:opacity-40">Add</button>
            </div>
            <button type="button" onClick={() => { setShowForm(false); setCustomGoal(''); }} className="text-xs mt-2" style={{ color: 'var(--ink-dim)' }}>Cancel</button>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="cine-glass cine-lift w-full rounded-2xl p-6 text-center" style={{ borderStyle: 'dashed' }}>
            <span className="w-10 h-10 rounded-xl grid place-items-center mx-auto mb-2" style={{ background: 'var(--glass)', color: 'var(--accent2)' }}><Plus className="w-5 h-5" /></span>
            <p className="font-display font-semibold text-sm">Write your own goal</p>
          </button>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className="cine-rise">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5" style={{ color: 'var(--gold)' }} /><h2 className="font-display font-bold">Goal inspiration</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <button key={s.title} onClick={() => handleAdd(s.title)} className="cine-glass cine-lift rounded-xl p-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{ border: '2px solid var(--line)', color: 'var(--accent2)' }}><Plus className="w-3 h-3" /></span>
                  <div>
                    <p className="text-sm font-medium leading-snug">{s.title}</p>
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5" style={{ background: `${CAT_TINT[s.category] || '#3B94FF'}22`, color: CAT_TINT[s.category] || '#3B94FF' }}>{s.category}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="cine-rise">
          <h2 className="font-display font-bold mb-3">Completed ({completed.length})</h2>
          <div className="space-y-3">
            {completed.map((goal) => (
              <div key={goal.id} className="cine-glass rounded-2xl p-4 flex items-center gap-4" style={{ opacity: 0.6 }}>
                <span className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(26,160,106,.18)' }}><Check className="w-4 h-4" style={{ color: 'var(--good)' }} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-through">{goal.title}</p>
                  {goal.completed_at && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>Completed {new Date(goal.completed_at).toLocaleDateString()}</p>}
                </div>
                <button onClick={() => handleDelete(goal.id)} aria-label="Delete" className="cine-lift p-2 rounded-lg" style={{ color: 'var(--ink-dim)' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="pb-6" />
    </CinematicShell>
  );
}
