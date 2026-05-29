import './globals.css';

export const metadata = {
  title: 'AI Learning Platform — Housecall Pro',
  description: 'Personalized AI learning for the Housecall Pro team',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-warm text-ink">
        {children}
      </body>
    </html>
  );
}
