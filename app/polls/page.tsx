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

/**
 * Format a remaining time window into a compact string (e.g., "2d 3h 10m 05s").
 *
 * Why: Avoids re-implementing this presentation logic across pages (listing vs details).
 *
 * Assumptions:
 * - endDateISO is a valid ISO timestamp; now is a Date representing current time.
 *
 * Edge cases:
 * - If endDate <= now, returns 'Ended'.
 *
 * Connections:
 * - Used by PollsPage to show countdown for active polls with an end_date.
 */
function formatRemaining(endDateISO: string, now: Date): string {
  const endMs = new Date(endDateISO).getTime();
  let diff = Math.max(0, endMs - now.getTime());
  if (diff <= 0) return 'Ended';
  let seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Polls listing page that loads public polls and the user's own polls, with live countdowns.
 *
 * Why: Central workspace where users discover and manage polls. Performs client-side reads
 * permitted by RLS; sensitive writes remain on server actions.
 *
 * Assumptions:
 * - A valid session is required; unauthenticated visitors are redirected to /login.
 * - Supabase client is available and RLS restricts results to permitted rows.
 *
 * Edge cases:
 * - Auto-deactivates expired polls owned by the current user to keep UI accurate.
 * - Handles transient read failures with a friendly message.
 *
 * Connections:
 * - Links to /polls/[id] for details and voting, and /polls/[id]/edit for owners.
 */
export default function PollsPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    const nowLocal = new Date();
    const toDeactivate = polls
      .filter((p) => p.is_active && p.end_date && new Date(p.end_date) <= nowLocal && p.creator_id === session.user.id)
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

  /**
   * Delete handler for a poll and its options (owned by the current user).
   *
   * Why: Keeps client responsibility limited to composing allowed mutations; RLS ensures
   * the delete only affects rows owned by the user.
   *
   * Edge cases:
   * - Options delete may fail if none exist; we log and proceed to delete the poll.
   */
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
        const expired = !!(poll.end_date && new Date(poll.end_date) <= now);
        const effectiveActive = poll.is_active && !expired;
        const showCountdown = effectiveActive && !!poll.end_date;
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
              {showCountdown && poll.end_date && (
                <div className="text-sm text-muted-foreground">
                  Ends in {formatRemaining(poll.end_date, now)}
                </div>
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