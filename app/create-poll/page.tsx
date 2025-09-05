import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";

/**
 * Server action that creates a poll and its options atomically from a form submission.
 *
 * Why: Encapsulates creation logic on the server to respect Row Level Security and prevent clients
 * from crafting arbitrary inserts. Keeps transactional flow (insert poll, insert options, rollback on error).
 *
 * Assumptions:
 * - Auth is required; anonymous users are redirected to /login.
 * - At least 2 non-empty options are required.
 *
 * Edge cases:
 * - Invalid input redirects back with an error query param.
 * - On options insert failure, the previously created poll row is deleted to avoid orphaned polls.
 *
 * Connections:
 * - Consumed by the CreatePollForm component via the action prop.
 * - New poll id is returned to allow client UI to show success then navigate.
 */
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

/**
 * Server component page that authorizes the user and renders the CreatePollForm.
 *
 * Why: Ensures the viewer is authenticated at request time (server-side) before exposing
 * the create form, aligning with RLS and avoiding client flashes of protected UI.
 *
 * Assumptions:
 * - Supabase auth cookie is present and usable from server components.
 *
 * Edge cases:
 * - Unauthenticated users are redirected to /login from the server (no UI flash).
 *
 * Connections:
 * - Imports and passes the server action createPollAction to the CreatePollForm component.
 */
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