import { SidebarToggle } from '@/components/sidebar';
import BackButton from '@/components/back-button';

// `iconButton` lets a page swap the static icon for an interactive client
// button (e.g. the Tour's play button). When omitted, the icon is decorative.
export default function PageHeader({ icon: Icon, title, subtitle, iconButton }) {
  return (
    <header className="bg-ink sticky top-0 z-10 text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <SidebarToggle />
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
      </div>
    </header>
  );
}
