import './globals.css';
import ThemeToggle from '@/components/theme-toggle';
import { SessionWrapper } from '@/components/session-wrapper';
import { ProfileProvider } from '@/components/profile-provider';
import { ProgressionProvider } from '@/components/progression-provider';
import PageTracker from '@/components/page-tracker';

export const metadata = {
  title: 'AI Learning Platform — Housecall Pro',
  description: 'Personalized AI learning for the Housecall Pro team',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
              {children}
            </ProgressionProvider>
          </ProfileProvider>
        </SessionWrapper>
        <PageTracker />
        <ThemeToggle />
      </body>
    </html>
  );
}
