'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import Avatar from '@/components/avatar';
import {
  AVATAR_SLOTS, SLOT_LABELS, itemsForSlot, DEFAULT_AVATAR, unlockLabel,
} from '@/lib/avatar-catalog';
import { Sparkles } from 'lucide-react';

// Dev/QA contact sheet: every avatar item rendered on a default avatar so we can
// eyeball the whole catalog at a glance and spot anything that looks rough.
export default function AvatarPreviewPage() {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return <Shell><p className="text-center text-slate-500 py-10">Checking…</p></Shell>;
  }
  if (!allowed) {
    return <Shell><p className="text-center text-slate-500 py-10">Admins only.</p></Shell>;
  }

  const total = AVATAR_SLOTS.reduce((n, s) => n + itemsForSlot(s).length, 0);

  return (
    <Shell>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {total} items across {AVATAR_SLOTS.length} slots, each shown on a default avatar.
        </p>

        {AVATAR_SLOTS.map((slot) => {
          const items = itemsForSlot(slot);
          return (
            <section key={slot}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink dark:text-slate-200 mb-3">
                {SLOT_LABELS[slot]} <span className="text-slate-400 font-normal normal-case">({items.length})</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex flex-col items-center gap-1"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center overflow-hidden">
                      <Avatar avatar={{ ...DEFAULT_AVATAR, [slot]: item.id }} size={60} title={item.name} crown={item.id === 'hat_crown'} />
                    </div>
                    <span className="text-[11px] font-medium text-ink dark:text-slate-200 text-center leading-tight">{item.name}</span>
                    <span className="text-[9px] text-slate-400 text-center leading-tight">
                      {item.unlock?.level === 1 ? 'Default' : (unlockLabel(item) || '—')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={Sparkles} title="Avatar Catalog" subtitle="Contact sheet of every item" />
      {children}
    </div>
  );
}
