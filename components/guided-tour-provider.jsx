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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Animate typing `text` into a controlled React input/textarea. We use the native
// value setter + a dispatched 'input' event so React's onChange actually fires and
// its state updates (just setting el.value would be ignored by React).
async function typeIntoElement(selector, text) {
  const el = await waitForElement(selector, 2000);
  if (!el) return;
  el.focus();
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setNativeValue = Object.getOwnPropertyDescriptor(proto, 'value').set;
  for (let i = 1; i <= text.length; i++) {
    setNativeValue.call(el, text.slice(0, i));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(16);
  }
}

// Programmatically click a real button so the user sees the actual action happen
// (chat reply streams in, Discover finds results, a lesson starts).
async function clickElement(selector) {
  const el = await waitForElement(selector, 2000);
  if (el && !el.disabled) el.click();
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
  // Track which steps have already auto-clicked so going back then forward doesn't
  // fire a second real send (e.g. a duplicate chat message).
  const clickedRef = useRef(new Set());

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

  // After a step is spotlighted, run its demo actions: animate typing into a box,
  // and/or auto-click the real button to show how it works.
  const runStepActions = useCallback(async (index) => {
    const step = GUIDED_TOUR_STEPS[index];
    if (!step) return;
    if (step.type) {
      await typeIntoElement(step.type.selector, step.type.text);
    }
    if (step.autoClick && !clickedRef.current.has(index)) {
      clickedRef.current.add(index);
      await sleep(step.autoClickDelay ?? 600);
      await clickElement(step.autoClick);
    }
  }, []);

  const startTour = useCallback(async () => {
    if (driverRef.current) return; // already running
    idxRef.current = 0;
    clickedRef.current = new Set();
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
      onHighlighted: () => { runStepActions(idxRef.current); },
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
  }, [prepareStep, runStepActions, setOpen]);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
}
