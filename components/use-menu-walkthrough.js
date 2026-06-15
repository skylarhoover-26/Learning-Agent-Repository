'use client';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSidebar } from '@/components/sidebar';
import { MENU_WALKTHROUGH_STEPS } from '@/lib/menu-walkthrough-steps';

// Returns a function that opens the sidebar and runs the interactive spotlight
// walkthrough. Shared by the Tour deck button and the header play button.
export function useMenuWalkthrough() {
  const { setOpen } = useSidebar();

  return function startMenuWalkthrough() {
    // The sidebar must be open for its anchors to be visible/highlightable.
    setOpen(true);
    // Let the sidebar finish its 200ms slide-in before driver measures elements.
    setTimeout(() => {
      driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Done',
        steps: MENU_WALKTHROUGH_STEPS,
      }).drive();
    }, 260);
  };
}
