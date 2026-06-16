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

// Push a value into a controlled React input/textarea so its onChange fires and
// state updates. We must use the prototype's native value setter (React tracks the
// node's value internally; assigning el.value directly is ignored).
function setReactValue(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// Animate typing `text` into the box, character by character, for the demo.
async function typeIntoElement(selector, text) {
  const el = await waitForElement(selector, 2000);
  if (!el) return;
  el.focus();
  for (let i = 1; i <= text.length; i++) {
    setReactValue(el, text.slice(0, i));
    await sleep(16);
  }
}

// Make sure the box holds the full text before we click its button — guards
// against a missed/partial animation (or a fast click) leaving the button
// disabled so nothing generates. Returns once React has had a tick to re-enable.
async function ensureValue(selector, text) {
  const el = await waitForElement(selector, 2000);
  if (!el) return;
  if (el.value !== text) setReactValue(el, text);
  await sleep(120);
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

// A full-screen shield that swallows every click during the tour so people can't
// navigate off-script (e.g. tapping a sidebar link). It sits just below driver's
// popover (z-index 1000000000), so Next/Back/× stay clickable; our typing and
// auto-clicks fire programmatically, so they pass through fine.
const SHIELD_ID = 'tour-click-shield';
function showClickShield() {
  if (document.getElementById(SHIELD_ID)) return;
  const el = document.createElement('div');
  el.id = SHIELD_ID;
  el.style.cssText = 'position:fixed;inset:0;z-index:999999999;background:transparent;';
  // driver.js sets `.driver-active * { pointer-events: none }` on every element,
  // which would make this shield click-through — force it back on.
  el.style.setProperty('pointer-events', 'auto', 'important');
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'wheel']
    .forEach((t) => el.addEventListener(t, swallow, { capture: true, passive: false }));
  document.body.appendChild(el);
}
function hideClickShield() {
  document.getElementById(SHIELD_ID)?.remove();
}

// Disable / re-enable the popover's Next button while content is generating, so
// people can't skip ahead before the result lands.
function setNextLocked(locked) {
  const btn = document.querySelector('.driver-popover-next-btn');
  if (!btn) return;
  if (locked) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.textContent = 'Generating…';
  } else {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.textContent = 'Next →';
  }
}

export function TourProvider({ children }) {
  const router = useRouter();
  const { setOpen } = useSidebar();
  const driverRef = useRef(null);
  const idxRef = useRef(0);
  // Track which steps have already auto-clicked so going back then forward doesn't
  // fire a second real send (e.g. a duplicate chat message).
  const clickedRef = useRef(new Set());
  // True while a step is waiting on generated content — blocks Next (button + keys).
  const lockedRef = useRef(false);

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
  // auto-click the real button, and lock Next until the generated result appears.
  const runStepActions = useCallback(async (index) => {
    const step = GUIDED_TOUR_STEPS[index];
    if (!step) return;
    // Lock immediately if this step waits on generated content, so a fast click
    // can't skip the demo before it runs.
    if (step.waitFor) { lockedRef.current = true; setNextLocked(true); }
    if (step.type) {
      await typeIntoElement(step.type.selector, step.type.text);
    }
    if (step.autoClick && !clickedRef.current.has(index)) {
      clickedRef.current.add(index);
      // Guarantee the input is populated so the button is enabled, then click.
      if (step.ensure) await ensureValue(step.ensure.selector, step.ensure.text);
      await sleep(step.autoClickDelay ?? 600);
      await clickElement(step.autoClick);
    }
    if (step.waitFor) {
      // Wait for the generated result to actually appear (returns null on timeout).
      const found = await waitForElement(step.waitFor, step.waitForTimeout ?? 30000);
      if (idxRef.current === index) {
        lockedRef.current = false;
        setNextLocked(false);
        // Only auto-advance once the content is really there — otherwise we'd jump
        // to the "results" step while the page is still generating. On a timeout we
        // just unlock Next so the user can proceed manually.
        if (step.advanceOnReady && found) return true;
      }
    }
    return false;
  }, []);

  const startTour = useCallback(async () => {
    if (driverRef.current) return; // already running
    idxRef.current = 0;
    clickedRef.current = new Set();
    lockedRef.current = false;
    const steps = GUIDED_TOUR_STEPS.map(s => ({
      element: s.element,
      popover: { title: s.popover.title, description: s.popover.description },
    }));

    // Move to the next step (shared by the Next button and auto-advance).
    const advance = async () => {
      const next = idxRef.current + 1;
      if (next >= steps.length) { d.destroy(); return; }
      idxRef.current = next;
      await prepareStep(next);
      if (driverRef.current) d.moveNext();
    };

    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      steps,
      onHighlighted: async () => {
        const idx = idxRef.current;
        const shouldAdvance = await runStepActions(idx);
        if (shouldAdvance && driverRef.current && idxRef.current === idx) await advance();
      },
      onNextClick: async () => {
        if (lockedRef.current) return; // content still generating — don't skip ahead
        await advance();
      },
      onPrevClick: async () => {
        lockedRef.current = false; // stepping back cancels any pending wait-lock
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
        hideClickShield();
      },
    });

    driverRef.current = d;
    showClickShield();
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
