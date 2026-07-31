// One identity colour per section, used for the card hover glow (--tilt-accent).
//
// Lesson and Games already felt alive because their cards carry real colour —
// Lesson by depth, Games by difficulty. The sections whose cards had no colour of
// their own all fell back to the app accent, so every hover glowed the same blue.
// On a blue-white page background (#EAF0FB → #F4F8FF) that blue has the least
// separation of anything in the palette, which is exactly why it read as "getting
// lost".
//
// Chosen for meaning first, then distinctness:
//   AI News   green  — already the colour of its own "Take a lesson" link
//   Discover  violet — the flagship section, so the most distinctive hue
//   Chat      teal   — calm/conversational, and clearly apart from the others
//
// Deliberately NOT --gold (#FFB706): gold means XP, levels and streaks
// throughout the app, and reusing it for a generic hover would blur that.
//
// Only three entries on purpose. Every other section's cards ALREADY carry a
// colour that encodes something real, and a section-level colour would override
// meaning with decoration:
//   Lesson       depth (green / amber / orange / red)
//   Games        difficulty
//   Library      difficulty (see DIFFICULTY_GLOW in use-case-library.jsx)
//   Prompts      category
//   Achievements badge category
export const SECTION_COLORS = {
  aiNews: '#1AA06A',
  discover: '#8B5CF6',
  chat: '#14B8A6',
};
