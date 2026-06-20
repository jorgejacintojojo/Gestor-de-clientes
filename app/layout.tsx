import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'CRM Pro - Professional mobile CRM client and metrics management',
  description: 'Manage clients, companies, deals, followups, and view analytics in real-time.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body suppressHydrationWarning className="text-white font-sans min-h-screen select-none relative" style={{
        background: 'radial-gradient(circle at 10% 20%, #4f46e5 0%, transparent 40%), radial-gradient(circle at 90% 10%, #ec4899 0%, transparent 45%), radial-gradient(circle at 90% 90%, #8b5cf6 0%, transparent 40%), radial-gradient(circle at 10% 80%, #06b6d4 0%, transparent 45%), #110e2e',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover'
      }}>
        {children}
      </body>
    </html>
  );
}

