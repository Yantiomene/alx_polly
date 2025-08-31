"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/components/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';


type Poll = {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  created_at: string;
};

export default function PollsPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        setPolls((data || []).map((p: any) => ({
          id: String(p.id),
          title: p.title as string,
          description: p.description ?? null,
          creator_id: p.creator_id as string,
          created_at: p.created_at as string,
        })));
      }
      setLoadingPolls(false);
    }

    if (!isLoading && session) {
      loadPolls();
    }
  }, [isLoading, session, supabase]);

  async function handleDelete(poll: Poll) {
    if (!session) return;
    const confirmed = window.confirm('Are you sure you want to delete this poll? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingId(poll.id);
    setError(null);

    const { error: optionsError } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', poll.id);

    if (optionsError) {
      console.warn('Failed to delete poll options or none exist, proceeding to delete poll.');
    }

    const { error: pollError } = await supabase
      .from('polls')
      .delete()
      .eq('id', poll.id)
      .eq('creator_id', session.user.id);

    if (pollError) {
      setError('Failed to delete poll.');
      setDeletingId(null);
      return;
    }

    setPolls(prev => prev.filter(p => p.id !== poll.id));
    setDeletingId(null);
  }

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

      {!loadingPolls && !error && polls.map((poll) => {
        const isOwner = poll.creator_id === session.user.id;
        return (
          <Card key={poll.id}>
            <CardHeader>
              <CardTitle>{poll.title}</CardTitle>
              {poll.description && (
                <CardDescription>{poll.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Button disabled title="Coming soon">View Poll</Button>
              {isOwner && (
                <>
                  <Link href={`/polls/${poll.id}/edit`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(poll)}
                    disabled={deletingId === poll.id}
                  >
                    {deletingId === poll.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}