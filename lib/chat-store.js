'use client';

import { saveToBlob } from './sync-store';

const CHAT_KEY = 'learner_chat_history';

export function getChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(messages) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    saveToBlob(CHAT_KEY, messages);
  } catch {
    // localStorage not available
  }
}

export function clearChatHistory() {
  try {
    localStorage.removeItem(CHAT_KEY);
    saveToBlob(CHAT_KEY, []);
  } catch {
    // localStorage not available
  }
}
