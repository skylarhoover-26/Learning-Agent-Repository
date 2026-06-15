'use client';

import { Play } from 'lucide-react';
import { useMenuWalkthrough } from '@/components/use-menu-walkthrough';

// The play button shown in the Tour's header. Clicking it launches the
// interactive spotlight walkthrough. Passed to PageHeader as `iconButton`.
export default function WalkthroughIconButton() {
  const startMenuWalkthrough = useMenuWalkthrough();
  return (
    <button
      type="button"
      onClick={startMenuWalkthrough}
      aria-label="Start the interactive walkthrough"
      title="Start the interactive walkthrough"
      className="w-9 h-9 rounded-md bg-brand flex items-center justify-center hover:bg-brand-700 transition-colors"
    >
      <Play className="w-5 h-5 text-white" strokeWidth={2.5} />
    </button>
  );
}
