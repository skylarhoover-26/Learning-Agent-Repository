'use client';

import { createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Home, Bell, ChevronDown, Sparkles, ExternalLink, Play,
} from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { useTour } from '@/components/guided-tour-provider';
import { MenuThemeToggle } from '@/components/theme-toggle';
import VoicePicker from '@/components/voice-picker';
import { NAV_SECTIONS, SKILL_SHOP_LINKS, ADMIN_ITEMS, useSidebar } from '@/components/sidebar';

function initials(name) {
  if (!name) return 'YOU';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'YOU';
}

// Cinematic top bar — logo + hamburger (opens the cinematic drawer), with
// Home / notifications / profile on the right.
function TopNav({ name, onMenu }) {
  return (
    <header className="sticky top-0 z-40 cine-glass" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onMenu}
            aria-label="Open menu"
            className="cine-lift w-10 h-10 rounded-full grid place-items-center"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))', boxShadow: '0 0 18px -3px var(--accent)' }}>
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-[15px]">AI Learning Coach</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>By Housecall Pro</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/" className="cine-lift inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold text-sm" style={{ color: 'var(--ink)' }}>
            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </Link>
          <Link href="/#" className="cine-lift relative w-10 h-10 rounded-full grid place-items-center" style={{ color: 'var(--ink)' }} aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--gold)', boxShadow: '0 0 8px var(--gold)' }} />
          </Link>
          <Link href="/profile" className="cine-lift inline-flex items-center gap-2 h-10 pl-3 pr-2 rounded-full" style={{ color: 'var(--ink)' }}>
            <span className="hidden sm:inline font-semibold text-sm">{name}</span>
            <span className="w-8 h-8 rounded-full grid place-items-center font-display font-bold text-[12px]" style={{ background: 'linear-gradient(135deg,var(--gold),var(--accent))', color: '#0A2443' }}>
              {initials(name)}
            </span>
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SectionLabel({ children }) {
  return <p className="px-4 pt-5 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{children}</p>;
}

// The cinematic drawer — reuses the real nav data/routes, styled to match.
function Drawer({ open, onClose }) {
  const pathname = usePathname();
  const { startTour } = useTour();
  const { isAdmin, isSectionHidden, isSectionComingSoon, isItemHidden, isItemComingSoon } = useMenuVisibility();

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function NavRow({ item }) {
    if (isItemHidden(item.href)) return null;
    const active = isActive(item.href);
    const soon = isItemComingSoon(item.href);
    return (
      <Link
        href={soon ? '#' : item.href}
        onClick={soon ? (e) => e.preventDefault() : onClose}
        aria-disabled={soon}
        className="cine-lift flex items-center gap-3 mx-2 px-3 py-2 rounded-xl"
        style={{
          background: active ? 'linear-gradient(135deg,rgba(59,148,255,.18),rgba(59,148,255,.06))' : 'transparent',
          color: soon ? 'var(--ink-dim)' : 'var(--ink)',
          border: active ? '1px solid var(--line)' : '1px solid transparent',
          opacity: soon ? 0.6 : 1,
        }}
      >
        <item.icon className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--accent2)' : 'var(--ink-dim)' }} />
        <span className="text-sm font-medium">{item.label}{soon ? ' · soon' : ''}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Backdrop — only on small screens (docked on desktop, no dimming). */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-[60] transition-opacity duration-300 lg:hidden"
        style={{ background: 'rgba(3,10,24,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      {/* Panel — docked below the top bar, slides in/out. */}
      <aside
        className="cine fixed top-16 left-0 z-[60] h-[calc(100dvh-4rem)] w-80 max-w-[86vw] overflow-y-auto transition-transform duration-300"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-104%)', boxShadow: '0 0 60px -10px rgba(0,0,0,.5)', backgroundAttachment: 'scroll' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 cine-glass" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))' }}>
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.4} />
            </div>
            <p className="font-display font-bold text-sm">Menu</p>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="cine-lift w-8 h-8 rounded-full grid place-items-center" style={{ color: 'var(--ink-dim)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="pb-10">
          <div className="pt-2">
            <NavRow item={{ href: '/', icon: Home, label: 'Home' }} />
          </div>

          {NAV_SECTIONS.map((section) => (
            isSectionHidden(section.title) ? null : (
              <div key={section.title}>
                <SectionLabel>{section.title}</SectionLabel>
                {isSectionComingSoon(section.title) ? (
                  <p className="mx-4 px-3 py-2 text-sm italic" style={{ color: 'var(--ink-dim)' }}>Coming soon</p>
                ) : section.items.map((item) => (
                  item.themeToggle ? (
                    <div key="theme" className="mx-2 px-1">
                      <div className="cine-glass rounded-xl px-2 py-1 mt-1"><MenuThemeToggle /></div>
                    </div>
                  ) : item.voicePicker ? (
                    <div key="voice" className="mx-2 px-1">
                      <div className="cine-glass rounded-xl px-2 py-1 mt-1"><VoicePicker /></div>
                    </div>
                  ) : item.walkthrough ? (
                    <button
                      key="tour"
                      onClick={() => { onClose(); startTour(); }}
                      className="cine-lift w-full flex items-center gap-3 mx-2 px-3 py-2 rounded-xl text-left"
                      style={{ color: 'var(--ink)' }}
                    >
                      <Play className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-dim)' }} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ) : (
                    <NavRow key={item.href} item={item} />
                  )
                ))}

                {/* HCP Skill Shop sits under Learn — external links. */}
                {section.title === 'Learn' && !isSectionHidden('HCP Skill Shop') && (
                  <>
                    <SectionLabel>HCP Skill Shop</SectionLabel>
                    {SKILL_SHOP_LINKS.map((link) => (
                      isItemHidden(link.href) ? null : (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={onClose}
                          className="cine-lift flex items-center gap-3 mx-2 px-3 py-2 rounded-xl"
                          style={{ color: 'var(--ink)' }}
                        >
                          <ExternalLink className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-dim)' }} />
                          <span className="text-sm font-medium">{link.label}</span>
                        </a>
                      )
                    ))}
                  </>
                )}
              </div>
            )
          ))}

          {isAdmin && (
            <div>
              <SectionLabel>Admin</SectionLabel>
              {ADMIN_ITEMS.map((item) => <NavRow key={item.href} item={item} />)}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

// Marks that a cinematic top bar is already present, so the legacy PageHeader
// renders nothing (avoids a double header on framed pages).
const FrameContext = createContext(false);
export function useInCinematicFrame() { return useContext(FrameContext); }

// Immersive shell — cinematic background + top bar + docked, persistent drawer
// (shared app-wide via useSidebar, so it stays open page to page) + a standard
// <main>. Used by the bespoke (fully-redesigned) screens.
export default function CinematicShell({ children }) {
  const { profile } = useProfile();
  const name = profile?.display_name || 'there';
  const { open, setOpen, toggle } = useSidebar();

  return (
    <FrameContext.Provider value={true}>
      <div className="cine relative">
        <TopNav name={name} onMenu={toggle} />
        <Drawer open={open} onClose={() => setOpen(false)} />
        <div className={`transition-[padding] duration-300 ${open ? 'lg:pl-80' : ''}`}>
          <main className="relative max-w-6xl mx-auto px-6 py-10 space-y-10">
            {children}
          </main>
        </div>
      </div>
    </FrameContext.Provider>
  );
}

// Chrome-only frame — cinematic top bar + docked persistent drawer, but the page
// brings its own (already theme-aware) content. Lets complex functional pages
// adopt the cinematic navigation without a full rewrite. The page's own
// PageHeader hides itself via FrameContext so there's no double bar.
export function CinematicFrame({ children }) {
  const { profile } = useProfile();
  const name = profile?.display_name || 'there';
  const { open, setOpen, toggle } = useSidebar();

  return (
    <FrameContext.Provider value={true}>
      <div className="cine-frame cine-vars">
        <TopNav name={name} onMenu={toggle} />
        <Drawer open={open} onClose={() => setOpen(false)} />
        <div className={`transition-[padding] duration-300 ${open ? 'lg:pl-80' : ''}`}>
          {children}
        </div>
      </div>
    </FrameContext.Provider>
  );
}
