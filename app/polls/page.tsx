"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/components/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PollsPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    const loadUsername = async () => {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!error && data?.username) {
        setUsername(data.username);
      } else {
        // Fallback to user metadata if available
        const metaUsername = (session.user.user_metadata as any)?.username;
        if (metaUsername) setUsername(metaUsername);
      }
    };
    if (session) {
      loadUsername();
    }
  }, [session, supabase]);

  if (isLoading || !session) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const polls = [
    { id: '1', title: 'Favorite Programming Language?', description: 'Choose your favorite programming language.' },
    { id: '2', title: 'Best AI Framework?', description: 'Which AI framework do you prefer?' },
  ];

  return (
    <div className="space-y-4">
      {username && (
        <p className="text-sm text-muted-foreground">Welcome, {username}!</p>
      )}
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