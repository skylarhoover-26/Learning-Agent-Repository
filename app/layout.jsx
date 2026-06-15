import './globals.css';
import { Inter } from 'next/font/google';
import { SessionWrapper } from '@/components/session-wrapper';
import { ProfileProvider } from '@/components/profile-provider';
import { ProgressionProvider } from '@/components/progression-provider';
import PageTracker from '@/components/page-tracker';
import { SidebarProvider, SideNav, SidebarShell } from '@/components/sidebar';
import HelpWidget from '@/components/help-widget';
import OnboardingTour from '@/components/onboarding-tour';

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
        <SessionWrapper>
          <ProfileProvider>
            <ProgressionProvider>
              <SidebarProvider>
                <SideNav />
                <SidebarShell>
                  {children}
                </SidebarShell>
                <OnboardingTour />
              </SidebarProvider>
            </ProgressionProvider>
          </ProfileProvider>
        </SessionWrapper>
        <PageTracker />
        <HelpWidget />
      </body>
    </html>
  );
}
