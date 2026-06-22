'use client';

import { Eye, Shield } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Floating pill shown only to real admins who are previewing the app as a
// regular user. Always-present escape hatch back to the admin view, on every
// page, so an admin can never get stuck behind their own visibility toggles.
export default function PreviewModeBanner() {
  const { isAdmin, previewAsUser, setPreviewAsUser } = useMenuVisibility();
  if (!isAdmin || !previewAsUser) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full bg-slate-900 text-white shadow-lg pl-4 pr-2 py-2">
      <Eye className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-sm font-medium">Viewing as a regular user</span>
      <button
        type="button"
        onClick={() => setPreviewAsUser(false)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-semibold transition-colors"
      >
        <Shield className="w-3.5 h-3.5" />
        Back to admin view
      </button>
    </div>
  );
}
