'use client';

import { createContext, useContext, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSidebar } from '@/components/sidebar';
import { GUIDED_TOUR_STEPS } from '@/lib/guided-tour';

const TourContext = createContext(null);
export function useTour() {
  return useContext(TourContext) || { startTour: () => {} };
}

// Poll for an element — it may not exist yet right after a route change or after
// the profile dropdown is asked to open. Resolves null on timeout so we don't stall.
function waitForElement(selector, timeout = 4000) {
  return new Promise((resolve) => {
    const start = performance.now();
    (function check() {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (performance.now() - start > timeout) return resolve(null);
      requestAnimationFrame(check);
    })();
  });
}

// Tell the header name dropdown to open/close so the tour can highlight its items.
function setProfileMenu(state) {
  window.dispatchEvent(new CustomEvent('tour:user-menu', { detail: state }));
}

export function TourProvider({ children }) {
  const router = useRouter();
  const { setOpen } = useSidebar();
  const driverRef = useRef(null);
  const idxRef = useRef(0);

  // Run a step's side effects (navigate, open the sidebar/dropdown) and wait for
  // its target element to exist before driver highlights it.
  const prepareStep = useCallback(async (index) => {
    const step = GUIDED_TOUR_STEPS[index];
    if (!step) return;
    if (step.route && window.location.pathname !== step.route) router.push(step.route);
    setOpen(true); // sidebar must stay open for its anchors
    if (step.profileMenu) setProfileMenu(step.profileMenu);
    await waitForElement(step.element);
  }, [router, setOpen]);

  const startTour = useCallback(async () => {
    if (driverRef.current) return; // already running
    idxRef.current = 0;
    const steps = GUIDED_TOUR_STEPS.map(s => ({
      element: s.element,
      popover: { title: s.popover.title, description: s.popover.description },
    }));

    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      steps,
      onNextClick: async () => {
        const next = idxRef.current + 1;
        if (next >= steps.length) { d.destroy(); return; }
        idxRef.current = next;
        await prepareStep(next);
        if (driverRef.current) d.moveNext();
      },
      onPrevClick: async () => {
        const prev = idxRef.current - 1;
        if (prev < 0) return;
        idxRef.current = prev;
        await prepareStep(prev);
        if (driverRef.current) d.movePrevious();
      },
      onCloseClick: () => d.destroy(),
      onDestroyed: () => {
        driverRef.current = null;
        setProfileMenu('close');
      },
    });

    driverRef.current = d;
    setOpen(true);
    // Let the sidebar finish its slide-in, then prep + show the first step.
    await new Promise(r => setTimeout(r, 280));
    await prepareStep(0);
    if (driverRef.current) d.drive(0);
  }, [prepareStep, setOpen]);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
}
