'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between p-4 bg-gray-100 shadow-sm">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/">
          <Button variant={pathname === '/' ? 'default' : 'ghost'} className="text-base hover:text-gray-900">Home</Button>
        </Link>
        <Link href="/polls">
          <Button variant={pathname === '/polls' ? 'default' : 'ghost'} className="text-base hover:text-gray-900">Polls</Button>
        </Link>
        <Link href="/create-poll">
          <Button variant={pathname === '/create-poll' ? 'default' : 'ghost'} className="text-base hover:text-gray-900">Create Poll</Button>
        </Link>
      </div>
      <div className="flex gap-2 md:gap-4">
        <Link href="/login">
          <Button variant={pathname === '/login' ? 'default' : 'outline'} className="text-base hover:text-gray-900">Login</Button>
        </Link>
        <Link href="/signup">
          <Button variant={pathname === '/signup' ? 'default' : 'outline'} className="text-base hover:text-gray-900">Sign Up</Button>
        </Link>
      </div>
    </nav>
  );
}