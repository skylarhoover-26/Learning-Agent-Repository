'use client';

import { useState, useMemo, useRef } from 'react';
import { Check, X, Loader2, PencilLine, ListChecks, Shuffle, Lightbulb, ArrowUpDown, FolderTree, GripVertical, MessageSquare, Send, RotateCcw } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';
import { mentionsOpenTool } from '@/components/open-tool-link';

const MAX_ATTEMPTS = 3;

// Activity prompts can contain markdown (numbered steps, bullets, **bold**) —
// render them through the shared formatter so they read cleanly instead of as a
// run-on string with literal asterisks.
function Prompt({ text, fallback }) {
  if (!text && !fallback) return null;
  return (
    <div className="mb-3 text-sm font-medium text-ink dark:text-slate-200">
      <FormattedContent text={text || fallback} />
    </div>
  );
}

// A required, interactive checkpoint that proves a learning objective. The
// learner gets up to 3 tries with feedback on each miss; after the 3rd we reveal
// the answer + why and unlock continuing. It calls onResolve(passed) once it's
// settled (either passed, or attempts exhausted).
export default function LessonActivity({ activityType, activity, objective, onResolve, resolved, passed, toolLabel }) {
  const type = activityType || 'mcq';
  const TYPE_META = {
    mcq: { icon: ListChecks, label: 'Quick check' },
    write: { icon: PencilLine, label: 'Your turn — try it' },
    match: { icon: Shuffle, label: 'Match them up' },
    scenario: { icon: Lightbulb, label: 'What would you do?' },
    order: { icon: ArrowUpDown, label: 'Put these in order' },
    categorize: { icon: FolderTree, label: 'Sort these out' },
  };
  const meta = TYPE_META[type] || TYPE_META.mcq;
  const common = { activity, onResolve, resolved, passed };
  const writeProps = { ...common, toolLabel };

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${resolved ? (passed ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : 'border-slate-300 bg-slate-50 dark:bg-slate-800') : 'border-brand-300 bg-brand-50/40 dark:bg-slate-800'}`}>
      <div className="flex items-center gap-2 mb-1">
        <meta.icon className={`w-5 h-5 ${resolved ? (passed ? 'text-green-600' : 'text-slate-500') : 'text-brand'}`} />
        <h3 className="font-bold text-ink dark:text-slate-200">{meta.label}</h3>
        {resolved && (passed
          ? <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-green-600"><Check className="w-4 h-4" /> Passed</span>
          : <span className="ml-auto text-xs text-slate-500">Answer revealed</span>)}
      </div>
      {objective && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Proves: {objective}</p>}

      {type === 'mcq' && <Mcq {...common} />}
      {type === 'write' && <Write {...writeProps} />}
      {type === 'match' && <Match {...common} />}
      {type === 'scenario' && <Scenario {...common} />}
      {type === 'order' && <Order {...common} />}
      {type === 'categorize' && <Categorize {...common} />}
    </div>
  );
}

function AttemptHint({ attempts }) {
  const left = MAX_ATTEMPTS - attempts;
  if (left <= 0) return null;
  return <p className="text-[11px] text-slate-400 mt-2">{left} {left === 1 ? 'try' : 'tries'} left</p>;
}

function Mcq({ activity, onResolve, resolved, passed }) {
  const [picked, setPicked] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const options = activity?.options || [];
  const correct = activity?.correctIndex ?? 0;
  const fb = activity?.optionFeedback || [];

  function choose(i) {
    if (resolved) return;
    setPicked(i);
    if (i === correct) { onResolve(true); return; }
    const n = attempts + 1;
    setAttempts(n);
    if (n >= MAX_ATTEMPTS) onResolve(false);
  }

  return (
    <div>
      <Prompt text={activity?.question} />
      <div className="space-y-2">
        {options.map((opt, i) => {
          const revealCorrect = resolved && i === correct;
          const wrongPick = !resolved && picked === i;
          let cls = 'border-slate-200 dark:border-slate-600 hover:border-brand-300 text-ink dark:text-slate-200';
          if (revealCorrect) cls = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
          else if (wrongPick) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
          return (
            <button key={i} onClick={() => choose(i)} disabled={resolved}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm flex items-center justify-between gap-2 transition-all disabled:cursor-default ${cls}`}>
              <span>{opt}</span>
              {revealCorrect && <Check className="w-4 h-4 shrink-0" />}
              {wrongPick && <X className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      {!resolved && picked != null && picked !== correct && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{fb[picked] || 'Not quite — try again.'}</p>
      )}
      {resolved && activity?.explanation && (
        <p className="text-xs text-green-700 dark:text-green-400 mt-2">{activity.explanation}</p>
      )}
      {!resolved && <AttemptHint attempts={attempts} />}
    </div>
  );
}

function Write({ activity, onResolve, resolved, passed, toolLabel }) {
  const [text, setText] = useState('');
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const passScore = activity?.passScore ?? 70;
  const score = grade?.score || 0;
  const isPass = score >= passScore;
  // Activities whose instructions tell the learner to do the work in their AI
  // tool: the box holds the prompt they used there, so label it that way.
  const inTool = mentionsOpenTool(activity?.instructions, toolLabel);
  const placeholder = activity?.placeholder
    || (inTool ? `Paste the prompt you used in ${toolLabel || 'your AI tool'}…` : 'Type your response…');

  // Discuss-your-score chat (revise & resubmit). { role, content }
  const [discussOpen, setDiscussOpen] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  async function submit() {
    if (!text.trim() || grading) return;
    setGrading(true);
    try {
      const res = await fetch('/api/lesson/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sourceText: activity?.instructions, gradingCriteria: activity?.gradingCriteria }),
      });
      const data = await res.json();
      setGrade(data);
      // Credit is one-way: passing locks it in, and a later revision can only
      // upgrade — never strip a passed activity.
      if ((data.score || 0) >= passScore) { onResolve(true); return; }
      // Only count toward the 3-attempt auto-settle while still unresolved.
      if (!resolved) {
        const n = attempts + 1; setAttempts(n);
        if (n >= MAX_ATTEMPTS) onResolve(false);
      }
    } catch {
      setGrade({ score: 0, improvement: 'Something went wrong — try again.' });
    } finally {
      setGrading(false);
    }
  }

  async function sendDiscuss() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    const next = [...chat, { role: 'user', content: q }];
    setChat(next);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/lesson/grade-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: activity?.instructions,
          criteria: activity?.gradingCriteria,
          learnerResponse: text,
          score: grade?.score,
          strength: grade?.strength,
          improvement: grade?.improvement,
          messages: next,
        }),
      });
      const data = await res.json();
      setChat((c) => [...c, { role: 'assistant', content: data.reply || "Try tweaking your response and resubmitting to see a fresh score." }]);
    } catch {
      setChat((c) => [...c, { role: 'assistant', content: 'Something went wrong — try again in a moment.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  const showAttempts = !resolved && !grade;

  return (
    <div>
      <Prompt text={activity?.instructions} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand" />

      {grade && (
        <div className={`mt-2 text-sm rounded-lg p-3 ${isPass ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'}`}>
          <p className="font-semibold">Score: {grade.score ?? 0}/100 {isPass ? (score >= 100 ? '— perfect!' : '— nice!') : `(need ${passScore})`}</p>
          {grade.strength && <p className="mt-0.5">{grade.strength}</p>}
          {/* Always show how to improve when short of 100 — even on a pass. */}
          {grade.improvement && score < 100 && (
            <p className="mt-0.5">{isPass ? 'To push it to 100: ' : ''}{grade.improvement}</p>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button onClick={submit} disabled={grading || !text.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all">
          {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : grade ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {grading ? 'Checking…' : grade ? 'Revise & resubmit' : 'Submit'}
        </button>
        {grade && (
          <button onClick={() => setDiscussOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-600 transition-colors">
            <MessageSquare className="w-4 h-4" /> {discussOpen ? 'Hide discussion' : 'Why this score? How can I improve?'}
          </button>
        )}
      </div>
      {showAttempts && <AttemptHint attempts={attempts} />}

      {discussOpen && grade && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-subtle dark:bg-slate-900 p-3">
          {chat.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Ask why you got this score or how to make it stronger — then revise above and resubmit.</p>
          )}
          {chat.length > 0 && (
            <div className="space-y-2.5 mb-2">
              {chat.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2'}>
                  {m.role === 'user'
                    ? <div className="max-w-[85%] bg-brand text-white px-3 py-2 rounded-2xl rounded-br-md text-sm">{m.content}</div>
                    : <div className="flex-1 rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2 text-sm text-ink dark:text-slate-200"><FormattedContent text={m.content} /></div>}
                </div>
              ))}
              {chatLoading && <p className="text-xs text-slate-400 inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</p>}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendDiscuss()}
              placeholder="e.g. What would take this to 100?"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand" />
            <button onClick={sendDiscuss} disabled={chatLoading || !chatInput.trim()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {resolved && !passed && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">You can keep refining above to raise your score — keep this in mind: {activity?.gradingCriteria}</p>
      )}
    </div>
  );
}

function Match({ activity, onResolve, resolved, passed }) {
  const pairs = activity?.pairs || [];
  const rights = useMemo(() => [...pairs.map((p) => p.right)].reverse(), [pairs]);
  const [picks, setPicks] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);

  function setPick(i, v) { if (resolved) return; setPicks((p) => ({ ...p, [i]: v })); setChecked(false); }
  function check() {
    if (resolved) return;
    const allCorrect = pairs.every((p, i) => picks[i] === p.right);
    setChecked(true);
    if (allCorrect) { onResolve(true); return; }
    const n = attempts + 1; setAttempts(n);
    if (n >= MAX_ATTEMPTS) onResolve(false);
  }
  const allAnswered = pairs.every((_, i) => picks[i]);

  return (
    <div>
      <Prompt text={activity?.instructions} fallback="Match each item to its pair." />
      <div className="space-y-2">
        {pairs.map((p, i) => {
          const wrong = checked && !resolved && picks[i] !== p.right;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-ink dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">{p.left}</span>
              <span className="text-slate-400">→</span>
              <select value={resolved ? p.right : (picks[i] || '')} onChange={(e) => setPick(i, e.target.value)} disabled={resolved}
                className={`flex-1 text-sm rounded-lg px-3 py-2 border bg-white dark:bg-slate-900 text-ink dark:text-slate-200 outline-none ${wrong ? 'border-red-400' : resolved ? 'border-green-400' : 'border-slate-200 dark:border-slate-600'}`}>
                <option value="">Choose…</option>
                {rights.map((r, j) => <option key={j} value={r}>{r}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      {checked && !resolved && <p className="text-xs text-red-600 dark:text-red-400 mt-2">Some matches are off — adjust the red ones and check again.</p>}
      {resolved && !passed && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Here are the correct matches.</p>}
      {!resolved && (
        <>
          <button onClick={check} disabled={!allAnswered}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all">
            <Check className="w-4 h-4" /> Check
          </button>
          <AttemptHint attempts={attempts} />
        </>
      )}
    </div>
  );
}

function Scenario({ activity, onResolve, resolved, passed }) {
  const choices = activity?.choices || [];
  const [picked, setPicked] = useState(null);
  const [attempts, setAttempts] = useState(0);

  function choose(i) {
    if (resolved) return;
    setPicked(i);
    if (choices[i]?.correct) { onResolve(true); return; }
    const n = attempts + 1; setAttempts(n);
    if (n >= MAX_ATTEMPTS) onResolve(false);
  }

  return (
    <div>
      <Prompt text={activity?.situation} />
      <div className="space-y-2">
        {choices.map((c, i) => {
          const reveal = picked === i || (resolved && c.correct);
          let cls = 'border-slate-200 dark:border-slate-600 hover:border-brand-300 text-ink dark:text-slate-200';
          if (reveal && c.correct) cls = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
          else if (reveal && !c.correct) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
          return (
            <div key={i}>
              <button onClick={() => choose(i)} disabled={resolved}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all disabled:cursor-default ${cls}`}>{c.text}</button>
              {(picked === i || (resolved && c.correct)) && c.feedback && (
                <p className={`text-xs mt-1 pl-1 ${c.correct ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{c.feedback}</p>
              )}
            </div>
          );
        })}
      </div>
      {!resolved && <AttemptHint attempts={attempts} />}
    </div>
  );
}

function Order({ activity, onResolve, resolved, passed }) {
  const correctOrder = activity?.items || [];
  const [arr, setArr] = useState(() => [...correctOrder].reverse());
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const dragIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  function handleDrop(target) {
    if (resolved) return;
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from == null || from === target) return;
    setArr((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setChecked(false);
  }
  function check() {
    if (resolved) return;
    const correct = arr.every((it, i) => it === correctOrder[i]);
    setChecked(true);
    if (correct) { onResolve(true); return; }
    const n = attempts + 1; setAttempts(n);
    if (n >= MAX_ATTEMPTS) { setArr([...correctOrder]); onResolve(false); }
  }

  const display = resolved && !passed ? correctOrder : arr;
  return (
    <div>
      <Prompt text={activity?.instructions} fallback="Drag the items into the right order." />
      <div className="space-y-2">
        {display.map((it, i) => (
          <div
            key={`${it}-${i}`}
            draggable={!resolved}
            onDragStart={() => { if (!resolved) dragIndex.current = i; }}
            onDragOver={(e) => { if (resolved) return; e.preventDefault(); setOverIndex(i); }}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => { dragIndex.current = null; setOverIndex(null); }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
              resolved
                ? 'border-green-300 text-ink dark:text-slate-200'
                : overIndex === i
                  ? 'border-brand bg-brand-50 dark:bg-slate-700 text-ink dark:text-slate-200'
                  : 'border-slate-200 dark:border-slate-600 text-ink dark:text-slate-200 bg-white dark:bg-slate-900'
            } ${!resolved ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <span className="w-5 text-center text-xs font-bold text-slate-400">{i + 1}</span>
            {!resolved && <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-500 shrink-0" />}
            <span className="flex-1">{it}</span>
          </div>
        ))}
      </div>
      {!resolved && <p className="text-[11px] text-slate-400 mt-2">Drag the rows to reorder them.</p>}
      {checked && !resolved && <p className="text-xs text-red-600 dark:text-red-400 mt-2">Not the right order yet — keep arranging.</p>}
      {!resolved && (
        <>
          <button onClick={check} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all">
            <Check className="w-4 h-4" /> Check order
          </button>
          <AttemptHint attempts={attempts} />
        </>
      )}
    </div>
  );
}

function Categorize({ activity, onResolve, resolved, passed }) {
  const buckets = activity?.buckets || [];
  const items = activity?.items || [];
  const [picks, setPicks] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);

  function setPick(i, v) { if (resolved) return; setPicks((p) => ({ ...p, [i]: v })); setChecked(false); }
  function check() {
    if (resolved) return;
    const correct = items.every((it, i) => picks[i] === it.bucket);
    setChecked(true);
    if (correct) { onResolve(true); return; }
    const n = attempts + 1; setAttempts(n);
    if (n >= MAX_ATTEMPTS) onResolve(false);
  }
  const allAnswered = items.every((_, i) => picks[i]);

  return (
    <div>
      <Prompt text={activity?.instructions} fallback="Put each item in the right group." />
      <div className="space-y-2">
        {items.map((it, i) => {
          const wrong = checked && !resolved && picks[i] !== it.bucket;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-ink dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">{it.text}</span>
              <select value={resolved ? it.bucket : (picks[i] || '')} onChange={(e) => setPick(i, e.target.value)} disabled={resolved}
                className={`text-sm rounded-lg px-3 py-2 border bg-white dark:bg-slate-900 text-ink dark:text-slate-200 outline-none ${wrong ? 'border-red-400' : resolved ? 'border-green-400' : 'border-slate-200 dark:border-slate-600'}`}>
                <option value="">Group…</option>
                {buckets.map((b, j) => <option key={j} value={b}>{b}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      {checked && !resolved && <p className="text-xs text-red-600 dark:text-red-400 mt-2">Some are in the wrong group — fix the red ones.</p>}
      {!resolved && (
        <>
          <button onClick={check} disabled={!allAnswered}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all">
            <Check className="w-4 h-4" /> Check
          </button>
          <AttemptHint attempts={attempts} />
        </>
      )}
    </div>
  );
}
