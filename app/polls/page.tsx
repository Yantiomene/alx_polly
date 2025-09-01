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
  is_active: boolean;
  end_date: string | null; // added
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
        .select('id, title, description, is_public, is_active, creator_id, created_at, end_date')
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
          is_active: Boolean(p.is_active),
          end_date: p.end_date ?? null,
        })));
      }
      setLoadingPolls(false);
    }

    if (!isLoading && session) {
      loadPolls();
    }
  }, [isLoading, session, supabase]);

  // Auto-deactivate expired polls owned by the current user
  useEffect(() => {
    if (!session || loadingPolls) return;
    const now = new Date();
    const toDeactivate = polls
      .filter((p) => p.is_active && p.end_date && new Date(p.end_date) <= now && p.creator_id === session.user.id)
      .map((p) => p.id);
    if (toDeactivate.length === 0) return;

    (async () => {
      const { error } = await supabase
        .from('polls')
        .update({ is_active: false })
        .in('id', toDeactivate)
        .eq('creator_id', session.user.id);
      if (!error) {
        setPolls((prev) => prev.map((p) => (toDeactivate.includes(p.id) ? { ...p, is_active: false } : p)));
      }
    })();
  }, [session, loadingPolls, polls, supabase]);

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
        const now = new Date();
        const expired = !!(poll.end_date && new Date(poll.end_date) <= now);
        const effectiveActive = poll.is_active && !expired;
        return (
          <Card key={poll.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {poll.title}
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${effectiveActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                  title={effectiveActive ? 'Active' : 'Inactive'}
                  aria-label={effectiveActive ? 'Active' : 'Inactive'}
                />
              </CardTitle>
              {poll.description && (
                <CardDescription>{poll.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Link href={`/polls/${poll.id}`}>
                <Button>View Poll</Button>
              </Link>
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