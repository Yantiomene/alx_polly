'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost">Home</Button>
        </Link>
        <Link href="/polls">
          <Button variant="ghost">Polls</Button>
        </Link>
        <Link href="/create-poll">
          <Button variant="ghost">Create Poll</Button>
        </Link>
      </div>
      <div className="flex gap-4">
        <Link href="/login">
          <Button variant="outline">Login</Button>
        </Link>
        <Link href="/signup">
          <Button>Sign Up</Button>
        </Link>
      </div>
    </nav>
  );
}