import { SidebarToggle } from '@/components/sidebar';
import BackButton from '@/components/back-button';

export default function PageHeader({ icon: Icon, title, subtitle, onIconClick, iconLabel }) {
  const iconInner = <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />;
  return (
    <header className="bg-ink sticky top-0 z-10 text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <SidebarToggle />
        <BackButton />
        <div className="flex items-center gap-3">
          {onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              aria-label={iconLabel || 'Start'}
              title={iconLabel}
              className="w-9 h-9 rounded-md bg-brand flex items-center justify-center hover:bg-brand-700 transition-colors"
            >
              {iconInner}
            </button>
          ) : (
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              {iconInner}
            </div>
          )}
          <div>
            <h1 className="font-bold tracking-tight text-[17px] leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
