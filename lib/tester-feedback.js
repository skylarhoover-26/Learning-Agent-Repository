import andreaMcFadden from '@/data/tester-feedback/andrea-mcfadden.json';
import emilyDolan from '@/data/tester-feedback/emily-dolan.json';
import stormPilloff from '@/data/tester-feedback/storm-pilloff.json';
import azeretArriaga from '@/data/tester-feedback/azeret-arriaga.json';
import kariaSanchez from '@/data/tester-feedback/karia-sanchez.json';

// Feedback collected from testers via the test-script spreadsheets, imported
// into the in-app feedback view so it lives alongside real submissions.
// Add a new tester = drop a JSON file under data/tester-feedback/ and list it
// here. Records carry deterministic ids, so re-importing overwrites in place
// rather than creating duplicates.
const TESTER_FILES = [andreaMcFadden, emilyDolan, stormPilloff, azeretArriaga, kariaSanchez];

export function getTesterFeedbackRecords() {
  return TESTER_FILES.flat().map((r) => ({
    screenshotUrls: [],
    status: 'open',
    ...r,
  }));
}
