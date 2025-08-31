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

  const [polls, setPolls] = useState<Array<{ id: string; title: string; description: string | null }>>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    async function loadPolls() {
      if (!session) return;
      setLoadingPolls(true);
      setError(null);
      // Show public polls and the user's own polls
      const userId = session.user.id;
      const { data, error } = await supabase
        .from('polls')
        .select('id, title, description, is_public, creator_id, created_at')
        .or(`is_public.eq.true,creator_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to load polls.');
        setPolls([]);
      } else {
        setPolls((data || []).map(p => ({ id: String(p.id), title: p.title as string, description: (p as any).description ?? null })));
      }
      setLoadingPolls(false);
    }

    if (!isLoading && session) {
      loadPolls();
    }
  }, [isLoading, session, supabase]);

  if (isLoading || !session) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Available Polls</h1>

      {loadingPolls && (
        <div className="text-muted-foreground">Loading polls...</div>
      )}

      {error && (
        <div className="text-red-600">{error}</div>
      )}

      {!loadingPolls && !error && polls.length === 0 && (
        <div className="text-muted-foreground">No polls available yet.</div>
      )}

      {!loadingPolls && !error && polls.map((poll) => (
        <Card key={poll.id}>
          <CardHeader>
            <CardTitle>{poll.title}</CardTitle>
            {poll.description && (
              <CardDescription>{poll.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Button disabled title="Coming soon">View Poll</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}