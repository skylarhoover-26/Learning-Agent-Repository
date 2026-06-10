'use client';

import { useEffect, useRef, useState } from 'react';

let mermaidPromise = null;
function getMermaid() {
  // Load mermaid lazily so it only ships when a lesson actually has a diagram.
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
}

let idCounter = 0;

export default function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const idRef = useRef(`mmd-${++idCounter}`);

  useEffect(() => {
    let cancelled = false;
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');

    getMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'default',
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
          themeVariables: { fontFamily: 'inherit', fontSize: '14px' },
        });
        const { svg: rendered } = await mermaid.render(idRef.current, code.trim());
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  // If the model produced invalid diagram syntax, fall back to showing the
  // source so the slide never breaks.
  if (failed) {
    return (
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto my-3 font-mono">
        <code>{code.trim()}</code>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 h-24 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-pulse" />
    );
  }

  return (
    <div
      className="mermaid-diagram my-4 flex justify-center overflow-x-auto rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 p-4"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
