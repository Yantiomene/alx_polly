import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Navbar } from '@/components/ui/navbar';
import './globals.css';
import { AuthProvider } from '@/components/auth-context';

/**
 * Global Next.js metadata for the application shell.
 * Purpose: Defines the default <title> and description applied to all routes unless overridden.
 * Why needed: Provides consistent defaults for SEO and sharing across pages without duplication.
 * Connections: Consumed automatically by the Next.js App Router; pages may extend or override.
 */
export const metadata: Metadata = {
  title: 'PollMaster',
  description: 'Real-time polling application',
};

/**
 * RootLayout
 * Purpose: Provides the global HTML/body structure, fonts, providers, and top navigation for the entire app.
 * Why needed: Centralizes global UI (Navbar), context providers (AuthProvider), and fonts so all routes render consistently.
 * Assumptions: Navbar is safe across public and private routes; children are route segments rendered by Next.js.
 * Connections: Wraps every page in the app directory; AuthProvider exposes session info to descendants used by poll pages and auth flows.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pt-16">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
