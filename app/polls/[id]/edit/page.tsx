
'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import CreatePollForm from "@/components/CreatePollForm";
import { Button } from "@/components/ui/button";
import type { PollRow, OptionRow } from "@/lib/types";

export default function EditPollPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoll = async () => {
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select(
          "id, title, description, start_date, end_date, allow_multiple_votes, allow_anonymous_votes, is_public, is_active, creator_id"
        )
        .eq("id", params.id)
        .single();

      if (pollError || !pollData) {
        router.push("/polls?error=not_found");
        return;
      }

      const { data: optionsData, error: optionsError } = await supabase
        .from("poll_options")
        .select("id, text, order_index")
        .eq("poll_id", params.id)
        .order("order_index", { ascending: true });

      if (optionsError) {
        router.push(`/polls/${params.id}/edit?error=load_options_failed`);
        return;
      }

      setPoll(pollData as PollRow);
      setOptions((optionsData || []) as OptionRow[]);
      setLoading(false);
    };

    fetchPoll();
  }, [params.id, router, supabase]);

  const handleUpdatePoll = async (formData: FormData) => {
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
    const allowAnonymousVotes = formData.get("allow_anonymous_votes") === "on";
    const isPublic = formData.get("is_public") === "on";
    const isActive = formData.get("is_active") === "on";
    const startDateRaw = String(formData.get("start_date") || "").trim();
    const endDateRaw = String(formData.get("end_date") || "").trim();
    const option_ids = formData.getAll("option_ids[]").map((v) => String(v || ""));
    const options = formData.getAll("options[]").map((v) => String(v || "").trim());

    const response = await fetch(`/api/polls/${params.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            allow_multiple_votes: allowMultipleVotes,
            allow_anonymous_votes: allowAnonymousVotes,
            is_public: isPublic,
            is_active: isActive,
            start_date: startDateRaw,
            end_date: endDateRaw,
            option_ids,
            options
          }),
        });

    if (response.ok) {
      router.push(`/polls/${params.id}`);
    } else {
      const { error } = await response.json();
      alert(`Failed to update poll: ${error}`);
    }
  };

  const handleDeletePoll = async () => {
    if (confirm("Are you sure you want to delete this poll?")) {
      const response = await fetch(`/api/polls/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push("/polls");
      } else {
        const { error } = await response.json();
        alert(`Failed to delete poll: ${error}`);
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!poll) {
    return <div>Poll not found.</div>;
  }

  return (
    <div className="space-y-4">
      <CreatePollForm
        onSubmit={handleUpdatePoll}
        initial={{
          title: poll.title,
          description: poll.description,
          start_date: poll.start_date as any,
          end_date: poll.end_date as any,
          allow_multiple_votes: poll.allow_multiple_votes as any,
          allow_anonymous_votes: poll.allow_anonymous_votes as any,
          is_public: poll.is_public,
          is_active: poll.is_active,
          optionsWithIds: (options || []).map((o: OptionRow) => ({ id: o.id, text: o.text })),
          options: (options || []).map((o: OptionRow) => o.text),
        }}
        titleText="Edit Poll"
        submitLabel="Save Changes"
        successMessage="Poll updated successfully! Redirecting to poll..."
      />
      <div className="flex justify-end">
          <Button variant="destructive" onClick={handleDeletePoll}>Delete Poll</Button>
      </div>
    </div>
  );
}
