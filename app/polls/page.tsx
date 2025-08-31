"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
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

  async function handleStartEdit(poll: Poll) {
    setEditingId(poll.id);
    setEditTitle(poll.title);
    setEditDescription(poll.description ?? '');
  }

  function resetEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
    setSaving(false);
  }

  async function handleSaveEdit(pollId: string) {
    if (!session) return;
    const title = editTitle.trim();
    if (!title) {
      setError('Title cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('polls')
      .update({ title, description: editDescription.trim() || null })
      .eq('id', pollId)
      .eq('creator_id', session.user.id);

    if (error) {
      setError('Failed to save changes.');
      setSaving(false);
      return;
    }

    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, title, description: editDescription.trim() || null } : p));
    resetEdit();
  }

  async function handleDelete(poll: Poll) {
    if (!session) return;
    const confirmed = window.confirm('Are you sure you want to delete this poll? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingId(poll.id);
    setError(null);

    // First delete options (safer if no ON DELETE CASCADE)
    const { error: optionsError } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', poll.id);

    if (optionsError) {
      // Even if options deletion fails (e.g., none exist), attempt deleting the poll
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
        const isEditing = editingId === poll.id;
        return (
          <Card key={poll.id}>
            <CardHeader>
              {!isEditing ? (
                <>
                  <CardTitle>{poll.title}</CardTitle>
                  {poll.description && (
                    <CardDescription>{poll.description}</CardDescription>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Poll title"
                  />
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Button disabled title="Coming soon">View Poll</Button>
                  {isOwner && (
                    <>
                      <Button variant="secondary" onClick={() => handleStartEdit(poll)}>Edit</Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(poll)}
                        disabled={deletingId === poll.id}
                      >
                        {deletingId === poll.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={() => handleSaveEdit(poll.id)} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="secondary" onClick={resetEdit} disabled={saving}>Cancel</Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}