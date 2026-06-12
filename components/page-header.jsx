import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar';

export default function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <header className="bg-ink sticky top-0 z-10 text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <SidebarToggle />
        <Link href="/" className="p-2 rounded-lg hover:bg-white/10" aria-label="Back to dashboard">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-[17px] leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
