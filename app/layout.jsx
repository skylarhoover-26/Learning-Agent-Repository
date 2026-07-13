import './globals.css';
import { Inter } from 'next/font/google';
import { SessionWrapper } from '@/components/session-wrapper';
import { ProfileProvider } from '@/components/profile-provider';
import { ActiveToolProvider } from '@/components/active-tool-provider';
import { ToolCatalogProvider } from '@/components/tool-catalog-provider';
import { ProgressionProvider } from '@/components/progression-provider';
import { ChampionProvider } from '@/components/champion-provider';
import PageTracker from '@/components/page-tracker';
import GlobalXpPopup from '@/components/global-xp-popup';
import { SidebarProvider, SideNav, SidebarShell, MenuStrip } from '@/components/sidebar';
import { MenuVisibilityProvider } from '@/components/menu-visibility-provider';
import { HeaderProvider } from '@/components/header-context';
import HeaderBar from '@/components/header-bar';
import FeatureGuard from '@/components/feature-guard';
import PreviewModeBanner from '@/components/preview-mode-banner';
import { TourProvider } from '@/components/guided-tour-provider';
import HelpWidget from '@/components/help-widget';
import IdentityGate from '@/components/identity-gate';
import OnboardingTour from '@/components/onboarding-tour';
import CalibrationGate from '@/components/calibration-gate';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'AI Learning Coach — Housecall Pro',
  description: 'Personalized AI learning for the Housecall Pro team',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const theme = localStorage.getItem('theme');
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch {}
        ` }} />
      </head>
      <body className="min-h-screen bg-bg-warm text-ink dark:bg-slate-900 dark:text-slate-200">
        <IdentityGate />
        <SessionWrapper>
          <ProfileProvider>
            <ToolCatalogProvider>
            <ActiveToolProvider>
            <ProgressionProvider>
              <ChampionProvider>
              <SidebarProvider>
                <TourProvider>
                  <MenuVisibilityProvider>
                    <HeaderProvider>
                      <HeaderBar />
                      <SideNav />
                      <MenuStrip />
                      <SidebarShell>
                        <FeatureGuard>
                          {children}
                        </FeatureGuard>
                      </SidebarShell>
                      <PreviewModeBanner />
                    </HeaderProvider>
                  </MenuVisibilityProvider>
                  <CalibrationGate />
                  <OnboardingTour />
                  <GlobalXpPopup />
                </TourProvider>
              </SidebarProvider>
              </ChampionProvider>
            </ProgressionProvider>
            </ActiveToolProvider>
            </ToolCatalogProvider>
          </ProfileProvider>
        </SessionWrapper>
        <PageTracker />
        <HelpWidget />
      </body>
    </html>
  );
}
