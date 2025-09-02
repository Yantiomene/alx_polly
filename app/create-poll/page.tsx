import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";

export async function createPollAction(formData: FormData) {
  "use server";

  const supabase = createServerActionClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
  const allowAnonymousVotes = formData.get("allow_anonymous_votes") === "on";
  const startDateRaw = String(formData.get("start_date") || "").trim();
  const endDateRaw = String(formData.get("end_date") || "").trim();

  const optionValues = (formData as any)
    .getAll("options[]")
    .map((o: any) => String(o).trim())
    .filter(Boolean);

  if (!title || optionValues.length < 2) {
    redirect("/create-poll?error=invalid_input");
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title,
      description: description || null,
      creator_id: user!.id,
      is_public: true,
      is_active: true,
      allow_multiple_votes: allowMultipleVotes,
      allow_anonymous_votes: allowAnonymousVotes,
      ...(startDateRaw ? { start_date: startDateRaw } : {}),
      ...(endDateRaw ? { end_date: endDateRaw } : {}),
    })
    .select("id")
    .single();

  if (pollError || !poll?.id) {
    redirect("/create-poll?error=create_poll_failed");
  }

  const optionRows = optionValues.map((text: string, idx: number) => ({
    poll_id: poll.id,
    text,
    order_index: idx,
  }));

  const { error: optionsError } = await supabase.from("poll_options").insert(optionRows);

  if (optionsError) {
    await supabase.from("polls").delete().eq("id", poll.id);
    redirect("/create-poll?error=create_options_failed");
  }

  // Success: let client show a success message before navigating away
  return { ok: true, pollId: poll.id } as const;
}

export default async function CreatePollPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const CreatePollForm = (await import("@/components/CreatePollForm")).default;
  return <CreatePollForm action={createPollAction} />;
}