'use client';

import BackButton from '@/components/back-button';
import UserMenu from '@/components/user-menu';
import { useHeaderContext } from '@/components/header-context';

// The app's single, permanent dark top bar. It stays mounted across every
// navigation (rendered once here in the root layout) and just swaps its
// content when a page registers new icon/title/subtitle via <PageHeader> —
// so it can never flash away between pages. Pages that never call
// <PageHeader> (home, onboarding, auth, etc.) leave it hidden.
export default function HeaderBar() {
  const ctx = useHeaderContext();
  const header = ctx?.header;
  if (!header) return null;
  const { icon: Icon, title, subtitle, iconButton, actions } = header;

  return (
    <header className="js-topbar bg-ink sticky top-0 z-50 text-white">
      <div className="px-4 py-4 flex items-center gap-3">
        <BackButton />
        <div className="flex items-center gap-3">
          {iconButton ? iconButton : (
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              {Icon && <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />}
            </div>
          )}
          <div>
            <h1 className="font-bold tracking-tight text-[17px] leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {actions}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
