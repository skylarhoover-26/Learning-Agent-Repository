'use client';

// Global feedback state so any menu (docked sidebar or cinematic drawer) can open
// the same "Share feedback" modal. Mounted once near the app root.

import { createContext, useContext, useState, useCallback } from 'react';
import FeedbackModal from '@/components/feedback-modal';

const FeedbackContext = createContext({ openFeedback: () => {} });

export function useFeedback() {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openFeedback = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <FeedbackContext.Provider value={{ openFeedback }}>
      {children}
      <FeedbackModal open={open} onClose={close} />
    </FeedbackContext.Provider>
  );
}
