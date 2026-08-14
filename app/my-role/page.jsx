import { redirect } from 'next/navigation';

// My Role merged into My Profile — the role manager is a card there now
// (components/role-manager-card.jsx), so there is one place to change your
// department, team, tasks, experience level and goals instead of two pages with
// different capabilities. Old links, bookmarks and the profile Danger Zone
// pointer land on the right screen.
export default function MyRoleMergedRedirect() {
  redirect('/profile');
}
