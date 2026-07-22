import andreaMcFadden from '@/data/tester-feedback/andrea-mcfadden.json';
import emilyDolan from '@/data/tester-feedback/emily-dolan.json';
import stormPilloff from '@/data/tester-feedback/storm-pilloff.json';
import azeretArriaga from '@/data/tester-feedback/azeret-arriaga.json';
import kariaSanchez from '@/data/tester-feedback/karia-sanchez.json';
import teamTasks from '@/data/tester-feedback/team-tasks.json';
import { autoPriority } from '@/lib/feedback-priority';

// Feedback collected from testers via the test-script spreadsheets, imported
// into the in-app feedback view so it lives alongside real submissions.
// Add a new tester = drop a JSON file under data/tester-feedback/ and list it
// here. Records carry deterministic ids, so re-importing overwrites in place
// rather than creating duplicates.
const TESTER_FILES = [andreaMcFadden, emilyDolan, stormPilloff, azeretArriaga, kariaSanchez, teamTasks];

// Pull an initial priority out of the "(Priority: X)" / "(Severity: X)" note the
// testers/team recorded, so imported items aren't blank in the priority column.
function derivePriority(text) {
  const match = /(?:Priority|Severity):\s*(Critical|High|Med|Medium|Low|Future)/i.exec(text || '');
  if (!match) return null;
  const value = match[1].toLowerCase();
  if (value === 'medium') return 'Med';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getTesterFeedbackRecords() {
  return TESTER_FILES.flat().map((r) => ({
    screenshotUrls: [],
    status: 'open',
    // Explicit severity note wins; otherwise fall back to the category default.
    priority: derivePriority(r.text) || autoPriority(r.category),
    ...r,
  }));
}
