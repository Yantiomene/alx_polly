'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { useAuth } from '../auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useMemo, useRef, useEffect } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', onDocClick);
    }
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const handleLogout = async () => { 
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      setMenuOpen(false);
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  };

  const userInitial = useMemo(() => {
    if (!session?.user) return null;
    const meta = (session.user.user_metadata as any) || {};
    const username: string | undefined = meta.username;
    const name: string | undefined = meta.name || meta.full_name;
    const email: string | undefined = session.user.email || meta.email;

    const source = (username && username.trim()) || (name && name.trim()) || (email && email.trim());
    if (!source || source.length === 0) return null;
    const first = source[0];
    return first.toUpperCase();
  }, [session]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-input bg-white/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/80 dark:supports-[backdrop-filter]:bg-zinc-900/60">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/">
          <Button variant={pathname === '/' ? 'default' : 'ghost'} className="text-base text-zinc-900 dark:text-zinc-100">Home</Button>
        </Link>
        <Link href="/polls">
          <Button variant={pathname === '/polls' ? 'default' : 'ghost'} className="text-base text-zinc-900 dark:text-zinc-100">Polls</Button>
        </Link>
        <Link href="/create-poll">
          <Button variant={pathname === '/create-poll' ? 'default' : 'ghost'} className="text-base text-zinc-900 dark:text-zinc-100">Create Poll</Button>
        </Link>
      </div>
      {session ? (
        <div className="flex items-center gap-2 md:gap-4">
          {userInitial && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold select-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                title="Account"
              >
                {userInitial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-input bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="py-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      {loggingOut ? 'Logging out…' : 'Logout'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2 md:gap-4">
          <Link href="/login">
            <Button variant={pathname === '/login' ? 'default' : 'outline'} className="text-base text-zinc-900 dark:text-zinc-100">Login</Button>
          </Link>
          <Link href="/signup">
            <Button variant={pathname === '/signup' ? 'default' : 'outline'} className="text-base text-zinc-900 dark:text-zinc-100">Sign Up</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}