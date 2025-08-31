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
  is_public: boolean;
  is_active: boolean;
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
      "id, title, description, start_date, end_date, allow_multiple_votes, allow_anonymous_votes, is_public, is_active, creator_id"
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
    const isPublic = formData.get("is_public") === "on";
    const isActive = formData.get("is_active") === "on";
    const startDateRaw = String(formData.get("start_date") || "").trim();
    const endDateRaw = String(formData.get("end_date") || "").trim();

    const rawIds = formData.getAll("option_ids[]").map((v) => String(v || ""));
    const rawTexts = formData.getAll("options[]").map((v) => String(v || "").trim());

    // Build submitted options preserving parallel order; filter empty texts
    const submitted = rawTexts
      .map((text, idx) => ({ id: rawIds[idx] || null, text, order_index: idx }))
      .filter((o) => !!o.text);

    if (!title || submitted.length < 2) {
      redirect(`/polls/${pollId}/edit?error=invalid_input`);
    }

    // Update poll core fields (including visibility/active)
    const { error: updateError } = await supabase
      .from("polls")
      .update({
        title,
        description: description || null,
        allow_multiple_votes: allowMultipleVotes,
        allow_anonymous_votes: allowAnonymousVotes,
        is_public: isPublic,
        is_active: isActive,
        ...(startDateRaw ? { start_date: startDateRaw } : { start_date: null }),
        ...(endDateRaw ? { end_date: endDateRaw } : { end_date: null }),
      })
      .eq("id", pollId)
      .eq("creator_id", user.id);

    if (updateError) {
      redirect(`/polls/${pollId}/edit?error=update_failed`);
    }

    // Diff-based option update
    const { data: existing, error: loadOptsError } = await supabase
      .from("poll_options")
      .select("id, text, order_index")
      .eq("poll_id", pollId);

    if (loadOptsError) {
      redirect(`/polls/${pollId}/edit?error=update_options_failed`);
    }

    const existingById = new Map((existing || []).map((o) => [o.id, o] as const));
    const submittedIds = new Set(submitted.filter((s) => !!s.id).map((s) => s.id as string));

    // Deletes: existing options whose id not in submitted
    const toDelete = (existing || [])
      .filter((o) => !submittedIds.has(o.id))
      .map((o) => o.id);

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("poll_options")
        .delete()
        .in("id", toDelete)
        .eq("poll_id", pollId);
      if (delErr) {
        redirect(`/polls/${pollId}/edit?error=update_options_failed`);
      }
    }

    // Updates: items with id present
    for (const s of submitted) {
      if (s.id) {
        const { error: upErr } = await supabase
          .from("poll_options")
          .update({ text: s.text, order_index: s.order_index })
          .eq("id", s.id)
          .eq("poll_id", pollId);
        if (upErr) {
          redirect(`/polls/${pollId}/edit?error=update_options_failed`);
        }
      }
    }

    // Inserts: items without id
    const newRows = submitted
      .filter((s) => !s.id)
      .map((s) => ({ poll_id: pollId, text: s.text, order_index: s.order_index }));

    if (newRows.length > 0) {
      const { error: insErr } = await supabase.from("poll_options").insert(newRows);
      if (insErr) {
        redirect(`/polls/${pollId}/edit?error=update_options_failed`);
      }
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
        is_public: pollRow.is_public,
        is_active: pollRow.is_active,
        optionsWithIds: (options || []).map((o: OptionRow) => ({ id: o.id, text: o.text })),
        options: (options || []).map((o: OptionRow) => o.text),
      }}
      titleText="Edit Poll"
      submitLabel="Save Changes"
      successMessage="Poll updated successfully! Redirecting to polls…"
    />
  );
}