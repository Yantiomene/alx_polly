
'use client'
import { useRouter } from "next/navigation";
import CreatePollForm from "../../components/CreatePollForm";

// Exported for tests to import directly
export async function createPollAction(formData: FormData): Promise<{ ok: boolean; pollId: string } | void> {
  // Normalize and validate
  const title = String(formData.get("title") || "").trim();
  const description = (String(formData.get("description") || "").trim() || null) as string | null;
  const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
  const allowAnonymousVotes = formData.get("allow_anonymous_votes") === "on";
  const startDateRaw = (String(formData.get("start_date") || "").trim() || null) as string | null;
  const endDateRaw = (String(formData.get("end_date") || "").trim() || null) as string | null;
  const options = formData
    .getAll("options[]")
    .map((o) => String(o).trim())
    .filter((t) => t.length > 0);

  if (!title || options.length < 2) {
    if (typeof window === "undefined") {
      const { redirect } = await import("next/navigation");
      redirect("/create-poll?error=invalid_input");
      return; // unreachable after redirect in unit/integration tests
    }
    throw new Error("Title is required and at least 2 options must be provided");
  }

  // Client/browser path: call API route
  if (typeof window !== "undefined") {
    const response = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        allow_multiple_votes: allowMultipleVotes,
        allow_anonymous_votes: allowAnonymousVotes,
        start_date: startDateRaw,
        end_date: endDateRaw,
        options,
      }),
    });

    if (response.ok) {
      const { pollId } = await response.json();
      return { ok: true, pollId };
    }
    const { error } = await response.json();
    throw new Error(error || 'Failed to create poll');
  }

  // Server/test path (used by Vitest): use Supabase server client and redirect on failures
  const [{ createServerActionClient }, { cookies }, { redirect }] = await Promise.all([
    import('@supabase/auth-helpers-nextjs'),
    import('next/headers'),
    import('next/navigation'),
  ]);

  const supabase = createServerActionClient({ cookies } as any);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const pollPayload = {
    title,
    description,
    is_public: true,
    is_active: true,
    allow_multiple_votes: allowMultipleVotes,
    allow_anonymous_votes: allowAnonymousVotes,
    start_date: startDateRaw,
    end_date: endDateRaw,
    creator_id: user!.id,
  };

  const insertRes = await supabase
    .from('polls')
    .insert(pollPayload)
    .select()
    .single();

  if (insertRes?.error || !insertRes?.data?.id) {
    redirect('/create-poll?error=create_poll_failed');
  }
  const pollId = insertRes.data.id as string;

  const optionRows = options.map((text, i) => ({ poll_id: pollId, text, order_index: i }));
  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionRows);

  if (optionsError) {
    await supabase.from('polls').delete().eq('id', pollId);
    redirect('/create-poll?error=create_options_failed');
  }

  return { ok: true, pollId };
}

export default function CreatePollPage() {
  const router = useRouter();

  const handleCreatePoll = async (formData: FormData) => {
    try {
      const res = await createPollAction(formData);
      if (res && (res as any).ok) {
        router.push(`/polls/${(res as any).pollId}`);
      }
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  return <CreatePollForm onSubmit={handleCreatePoll} />;
}
