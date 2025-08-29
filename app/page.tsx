'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Welcome to PollMaster</h1>
        <p className="text-xl text-muted-foreground">Create and participate in real-time polls with ease</p>
        
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/create-poll">
            <Button size="lg">Create a Poll</Button>
          </Link>
          <Link href="/polls">
            <Button size="lg" variant="outline">Browse Polls</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
