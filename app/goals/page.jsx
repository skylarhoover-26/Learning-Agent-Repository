import { redirect } from 'next/navigation';

// Goals moved into the unified "My Growth" page.
export default function GoalsRedirect() {
  redirect('/growth?tab=goals');
}
