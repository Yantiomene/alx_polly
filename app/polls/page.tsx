"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/components/auth-context';

export default function PollsPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const polls = [
    { id: '1', title: 'Favorite Programming Language?', description: 'Choose your favorite programming language.' },
    { id: '2', title: 'Best AI Framework?', description: 'Which AI framework do you prefer?' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Available Polls</h1>
      {polls.map((poll) => (
        <Card key={poll.id}>
          <CardHeader>
            <CardTitle>{poll.title}</CardTitle>
            <CardDescription>{poll.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>View Poll</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}