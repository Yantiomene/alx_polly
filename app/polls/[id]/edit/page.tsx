import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";
import CreatePollForm from "@/components/CreatePollForm";

// Explicit row types to help TS inference
type PollRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  allow_multiple_votes: boolean;
  allow_anonymous_votes: boolean;
  creator_id: string;
};

type OptionRow = {
  id: string;
  text: string;
  order_index: number;
};

async function getPollWithOptions(
  supabase: ReturnType<typeof createServerComponentClient>,
  pollId: string
): Promise<{ poll: PollRow | null; options: OptionRow[]; error: unknown }> {
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      "id, title, description, start_date, end_date, allow_multiple_votes, allow_anonymous_votes, creator_id"
    )
    .eq("id", pollId)
    .single();

  if (pollError || !poll) return { poll: null, options: [], error: pollError };

  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, text, order_index")
    .eq("poll_id", pollId)
    .order("order_index", { ascending: true });

  return { poll: poll as PollRow, options: (options || []) as OptionRow[], error: optionsError };
}

export default async function EditPollPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pollId = params.id;
  const { poll, options, error } = await getPollWithOptions(supabase, pollId);

  if (error || !poll) {
    redirect("/polls?error=not_found");
  }

  const pollRow = poll as PollRow;

  if (pollRow.creator_id !== user.id) {
    redirect("/polls?error=forbidden");
  }

  async function updatePollAction(formData: FormData) {
    "use server";

    const supabase = createServerActionClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
    const allowAnonymousVotes = formData.get("allow_anonymous_votes") === "on";
    const startDateRaw = String(formData.get("start_date") || "").trim();
    const endDateRaw = String(formData.get("end_date") || "").trim();

    const optionValues = formData
      .getAll("options[]")
      .map((o) => String(o).trim())
      .filter(Boolean);

    if (!title || optionValues.length < 2) {
      redirect(`/polls/${pollId}/edit?error=invalid_input`);
    }

    // Update poll core fields
    const { error: updateError } = await supabase
      .from("polls")
      .update({
        title,
        description: description || null,
        allow_multiple_votes: allowMultipleVotes,
        allow_anonymous_votes: allowAnonymousVotes,
        ...(startDateRaw ? { start_date: startDateRaw } : { start_date: null }),
        ...(endDateRaw ? { end_date: endDateRaw } : { end_date: null }),
      })
      .eq("id", pollId)
      .eq("creator_id", user.id);

    if (updateError) {
      redirect(`/polls/${pollId}/edit?error=update_failed`);
    }

    // Replace options: delete then insert in order
    const { error: delError } = await supabase.from("poll_options").delete().eq("poll_id", pollId);
    if (delError) {
      redirect(`/polls/${pollId}/edit?error=update_options_failed`);
    }

    const optionRows = optionValues.map((text, idx) => ({ poll_id: pollId, text, order_index: idx }));
    const { error: insError } = await supabase.from("poll_options").insert(optionRows);
    if (insError) {
      redirect(`/polls/${pollId}/edit?error=update_options_failed`);
    }

    return { ok: true, pollId };
  }

  return (
    <CreatePollForm
      action={updatePollAction}
      initial={{
        title: pollRow.title,
        description: pollRow.description,
        start_date: pollRow.start_date as any,
        end_date: pollRow.end_date as any,
        allow_multiple_votes: pollRow.allow_multiple_votes as any,
        allow_anonymous_votes: pollRow.allow_anonymous_votes as any,
        options: (options || []).map((o: OptionRow) => o.text),
      }}
      titleText="Edit Poll"
      submitLabel="Save Changes"
      successMessage="Poll updated successfully! Redirecting to polls…"
    />
  );
}