'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

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
  // Feedback #220: "the flows the lessons generate are sometimes small and hard to
  // see. Would be nice if there was an enlarge button." A wide flowchart is scaled
  // to fit the lesson column (useMaxWidth), so a five-node flow can end up with
  // unreadable labels. Enlarging beats zooming the browser, which reflows the whole
  // lesson around it.
  const [zoomed, setZoomed] = useState(false);
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

  // Escape closes the enlarged view, like every other overlay in the app.
  useEffect(() => {
    if (!zoomed) return undefined;
    function onKey(e) { if (e.key === 'Escape') setZoomed(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomed]);

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
    <>
      <div className="mermaid-diagram group relative my-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
        <div
          className="flex justify-center overflow-x-auto p-4"
          // Safe: `svg` is mermaid's own render output for code we control, and
          // mermaid runs with securityLevel 'strict' (see the render call above).
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {/* Always present rather than hover-only: this is a touch-friendly app and
            a control you can't discover on a tablet may as well not exist. */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Enlarge diagram"
          title="Enlarge diagram"
          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-all"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Enlarge
        </button>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged diagram"
            className="relative w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="Close enlarged diagram"
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* [&_svg]:w-full overrides mermaid's useMaxWidth sizing, which would
                otherwise render it at the same cramped width inside the overlay —
                the exact problem this is here to fix. */}
            <div
              className="mermaid-diagram-zoomed flex justify-center pt-4 [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}
