// The AI competencies the onboarding quiz measures: labels, plain-language
// definitions, and the canonical key order.
//
// This is the PURE half, deliberately free of any storage imports, so both
// server code (the admin quiz API, which touches blob storage) and client code
// (the assessment UI) can import it without dragging the other's dependencies
// into their bundle. lib/calibration-store re-exports all three for the call
// sites that already import them from there.

export const SKILL_LABELS = {
  privacy: 'Data Privacy',
  prompting: 'Prompting',
  comms: 'Communication',
  eval: 'AI Evaluation',
  agents: 'AI Agents',
  data: 'Data Literacy',
  models: 'Model Selection',
};

// Shown as small grey text under each competency name so people know exactly
// what "AI Evaluation" or "Data Literacy" mean without having to hunt for a
// tooltip (feedback #205). Keep these short and jargon-free.
export const SKILL_DEFINITIONS = {
  privacy: 'Handling sensitive company and customer data responsibly with AI — sharing only what a task needs, and only on approved tools.',
  prompting: 'Getting reliable, useful results from AI by giving it clear instructions, context, and structure.',
  comms: 'Knowing when and how to use AI to draft, refine, and tailor messages — and when a human touch works better.',
  eval: 'Judging whether an AI answer is accurate and trustworthy before you act on it — spotting made-up facts and checking sources.',
  agents: 'Setting up or overseeing AI that runs tasks on its own, with the right guardrails and accuracy checks.',
  data: 'Using AI to work with data soundly — and being able to verify and defend the numbers it gives you.',
  models: 'Picking the right model for the job — a fast model for quick, simple work and a slower "deep-reasoning" one for complex, high-stakes tasks — in whatever AI tool you use.',
};

export const SKILL_KEYS = Object.keys(SKILL_LABELS);
