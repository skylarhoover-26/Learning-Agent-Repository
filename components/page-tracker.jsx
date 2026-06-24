'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageVisit } from '@/lib/track';

const PAGE_NAMES = {
  '/': 'Home',
  '/lesson': 'Lesson',
  '/modules': 'Modules',
  '/review': 'Review',
  '/quests': 'Quests',
  '/heatmap': 'Heatmap',
  '/discover': 'Discover',
  '/games': 'Games',
  '/onboarding': 'Onboarding',
  '/admin': 'Admin',
  '/admin/activity-log': 'Activity Log',
};

function getPageName(path) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  if (path.startsWith('/quests/')) return 'Quest Detail';
  if (path.startsWith('/games/')) return 'Game';
  if (path.startsWith('/admin/')) return 'Admin';
  return path.replace(/^\//, '') || 'Unknown';
}

export default function PageTracker() {
  const pathname = usePathname();
  const lastPath = useRef(null);

  useEffect(() => {
    if (pathname && pathname !== lastPath.current) {
      lastPath.current = pathname;
      trackPageVisit(getPageName(pathname), pathname);
    }
  }, [pathname]);

  return null;
}
