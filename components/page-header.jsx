import BackButton from '@/components/back-button';
import UserMenu from '@/components/user-menu';

// `iconButton` lets a page swap the static icon for an interactive client
// button (e.g. the Tour's play button). When omitted, the icon is decorative.
// `actions` renders optional controls in the right cluster, just before the
// user menu (e.g. a "Clear chat" button).
export default function PageHeader({ icon: Icon, title, subtitle, iconButton, actions }) {
  return (
    <header className="js-topbar bg-ink sticky top-0 z-50 text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <BackButton />
        <div className="flex items-center gap-3">
          {iconButton ? iconButton : (
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
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
