'use client';

import { createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Home, Sparkles, ExternalLink, Play,
} from 'lucide-react';
import UserMenu from '@/components/user-menu';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { useTour } from '@/components/guided-tour-provider';
import { MenuThemeToggle } from '@/components/theme-toggle';
import VoicePicker from '@/components/voice-picker';
import { NAV_SECTIONS, SKILL_SHOP_LINKS, ADMIN_ITEMS, useSidebar } from '@/components/sidebar';
import { isCinematicRoute } from '@/lib/cinematic-routes';

function initials(name) {
  if (!name) return 'YOU';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'YOU';
}

// Scene-wide pointer tilt (DISABLED for performance). The original handler wrote
// shared rotation vars on <html> on every mousemove; every `.cine-tilt` card
// read them and recomputed its 3D transform each frame, which — combined with
// the blurred glass cards over a fixed-attachment background — made navigation
// and the drawer feel laggy. Cards still lift on hover via the pure-CSS
// `.cine-tilt:hover` rule, so they stay interactive without the per-frame cost.
// Kept as a no-op so call sites need no change; re-enable selectively (e.g. Home
// only) if the parallax is missed.
function useSceneTilt() {
  // intentionally does nothing — see note above
}

// Cinematic top bar — logo + hamburger (opens the cinematic drawer), with
// Home / notifications / profile on the right.
function TopNav({ onMenu }) {
  // A dark cinematic top bar (like prod's) so the real UserMenu — Home,
  // notifications, and the full profile dropdown (Profile, My Role, My AI Tools,
  // My Tasks, Projects, Back to admin view, Log out) — reads in both themes.
  return (
    <header
      className="sticky top-0 z-50 text-white"
      style={{
        // Richer cinematic bar: a soft blue accent glow behind the logo layered
        // over a deep navy gradient, a hairline top highlight, and a low drop
        // shadow so it reads as a floating pane over the scene.
        background:
          'radial-gradient(680px 140px at 6% -40%, rgba(59,148,255,.22), transparent 70%),' +
          'radial-gradient(520px 120px at 99% -60%, rgba(255,183,6,.10), transparent 70%),' +
          'linear-gradient(90deg, rgba(7,17,40,.97), rgba(12,38,74,.92))',
        backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(255,255,255,.06), 0 10px 34px -18px rgba(0,0,0,.65)',
      }}
    >
      {/* Full-width + fixed h-16 (like prod) so it spreads edge to edge and can
          never reflow/shrink on scroll. `pl-3` aligns the hamburger with the
          drawer's icon column below it, so it doesn't float off on its own. */}
      <div className="pl-3 pr-4 sm:pr-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onMenu}
            aria-label="Toggle menu"
            className="w-10 h-10 rounded-full grid place-items-center text-white shrink-0 transition-all hover:brightness-125"
            style={{ background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="group flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg,#3B94FF,#FFB706)', boxShadow: '0 0 22px -4px rgba(59,148,255,.9)' }}>
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.4} />
            </span>
            <span className="leading-tight min-w-0">
              <span className="block font-display font-bold text-[15px] text-white truncate tracking-tight">AI Learning Coach</span>
              <span className="block text-[11px] text-white/55 tracking-wide">By Housecall Pro</span>
            </span>
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}

function SectionLabel({ children }) {
  return <p className="px-4 pt-5 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{children}</p>;
}

// Hover description for a drawer nav row — mirrors prod's ItemDescPopup so each
// section explains what it does, but styled to the cinematic frame. Appears
// after a short hover delay and disappears on click/navigation.
function NavDescTip({ text }) {
  if (!text) return null;
  return (
    <span
      className="pointer-events-none absolute left-11 right-2 top-[calc(100%-0.15rem)] z-20 rounded-lg text-white text-xs leading-snug px-3 py-2 shadow-xl opacity-0 invisible transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-hover:delay-500"
      style={{ background: 'linear-gradient(135deg, rgba(6,16,38,.97), rgba(12,32,66,.97))', border: '1px solid rgba(255,255,255,.12)' }}
    >
      {text}
    </span>
  );
}

// The cinematic drawer — reuses the real nav data/routes, styled to match.
function Drawer({ open, onClose }) {
  const pathname = usePathname();
  const { startTour } = useTour();
  const { isAdmin, actingAsAdmin, isManager, isSectionHidden, isSectionComingSoon, isItemHidden, isItemComingSoon } = useMenuVisibility();

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
        onClick={soon ? (e) => e.preventDefault() : undefined}
        aria-disabled={soon}
        aria-current={active ? 'page' : undefined}
        className="cine-lift group relative flex items-center gap-3 mx-2 px-3 py-2 rounded-xl"
        style={{
          background: active ? 'linear-gradient(135deg,rgba(59,148,255,.18),rgba(59,148,255,.06))' : 'transparent',
          color: soon ? 'var(--ink-dim)' : 'var(--ink)',
          border: active ? '1px solid var(--line)' : '1px solid transparent',
          opacity: soon ? 0.6 : 1,
        }}
      >
        <item.icon className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--accent2)' : 'var(--ink-dim)' }} />
        <span className="text-sm font-medium">{item.label}{soon ? ' · soon' : ''}</span>
        <NavDescTip text={item.desc} />
      </Link>
    );
  }

  return (
    <>
      {/* Backdrop — only on small screens (docked on desktop, no dimming).
          Sits below the top bar (z-50) so the bar always stays on top. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-[39] transition-opacity duration-300 lg:hidden"
        style={{ background: 'rgba(3,10,24,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      {/* Panel — docked below the top bar (z-40 < bar's z-50), slides in/out.
          `will-change: transform` promotes it to its own layer so the slide
          composites on the GPU instead of repainting each frame. */}
      <aside
        className="cine fixed top-16 left-0 z-40 h-[calc(100dvh-4rem)] min-h-0 w-80 max-w-[86vw] overflow-y-auto overscroll-contain transition-transform duration-300"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-104%)', willChange: 'transform', boxShadow: '0 0 60px -10px rgba(0,0,0,.5)', backgroundAttachment: 'scroll' }}
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

        <nav className="pb-28">
          <div className="pt-2">
            <NavRow item={{ href: '/', icon: Home, label: 'Home' }} />
          </div>

          {NAV_SECTIONS.map((section) => (
            // Manager section is only for people-managers (direct reports) or admins
            // — and hidden when an admin is "viewing as a regular user" (actingAsAdmin).
            (isSectionHidden(section.title) || (section.title === 'Manager' && !actingAsAdmin && !isManager)) ? null : (
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

// Marks that the cinematic chrome is present, so PageHeader renders nothing and
// skips registering with the prod HeaderBar (avoids a double header). Provided
// by CinematicChrome at the layout level for every cinematic route.
const FrameContext = createContext(false);
export function useInCinematicFrame() { return useContext(FrameContext); }

// The persistent cinematic chrome. Rendered ONCE in the root layout (not inside
// any page), so the living background + top bar + docked drawer stay mounted
// across navigation — clicking between cinematic tabs swaps only the page body,
// never tearing down and rebuilding the frame (which caused the flash/glitch).
// Mirrors how prod's HeaderBar is hoisted into the layout to avoid flashing.
//
// On non-cinematic routes it renders children untouched — the prod chrome
// (SideNav / MenuStrip / HeaderBar) handles those.
export function CinematicChrome({ children }) {
  const pathname = usePathname();
  const { open, setOpen, toggle } = useSidebar();
  useSceneTilt();

  if (!isCinematicRoute(pathname)) return children;

  return (
    <FrameContext.Provider value={true}>
      {/* `cine-frame` keeps the .js-topbar hide rule; `cine` supplies the living
          background (blue/gold glows + fixed gradient) + vars. */}
      <div className="cine-frame cine">
        <TopNav onMenu={toggle} />
        <Drawer open={open} onClose={() => setOpen(false)} />
        <div className={`transition-[padding] duration-300 ${open ? 'lg:pl-80' : ''}`}>
          {children}
        </div>
      </div>
    </FrameContext.Provider>
  );
}

// Immersive content wrapper for bespoke (fully-redesigned) screens like Home —
// the spacious, centered <main>. The chrome/background now come from the
// layout-level CinematicChrome, so this only owns content spacing.
export default function CinematicShell({ children }) {
  return (
    <main className="relative max-w-5xl mx-auto px-6 py-16 space-y-20 sm:space-y-24">
      {children}
    </main>
  );
}

// Framed pages bring their own content. The chrome lives in the layout now, so
// this is a passthrough that keeps all existing <CinematicFrame> call sites
// working unchanged.
export function CinematicFrame({ children }) {
  return children;
}
