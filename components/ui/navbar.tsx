'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  };

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
        <div className="flex gap-2 md:gap-4">
          <Button variant="outline" className="text-base text-zinc-900 dark:text-zinc-100" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Logout'}
          </Button>
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