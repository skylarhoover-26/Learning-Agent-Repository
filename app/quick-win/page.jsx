import { redirect } from 'next/navigation';

// Quick Win has been folded into the lesson screen as the "Surprise me" button.
// Keep this route working for old links by sending people there (surprise mode).
export default function QuickWinPage() {
  redirect('/lesson?surprise=1');
}
