import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Row types for clarity
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

async function getPollWithOptions(pollId: string): Promise<{ poll: PollRow | null; options: OptionRow[] }> {
  const supabase = createServerComponentClient({ cookies });

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      "id, title, description, start_date, end_date, allow_multiple_votes, allow_anonymous_votes, is_public, is_active, creator_id"
    )
    .eq("id", pollId)
    .single();

  if (pollError || !poll) return { poll: null, options: [] };

  const { data: options } = await supabase
    .from("poll_options")
    .select("id, text, order_index")
    .eq("poll_id", pollId)
    .order("order_index", { ascending: true });

  // If options error occurs we can still render the poll with empty options
  return { poll: poll as PollRow, options: (options || []) as OptionRow[] };
}

export default async function PollDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pollId = params.id;
  const { poll, options } = await getPollWithOptions(pollId);

  if (!poll) {
    notFound();
  }

  const pollRow: PollRow = poll as PollRow;

  // If the poll is private and the viewer is not the owner, don't leak existence
  if (!pollRow.is_public && pollRow.creator_id !== user?.id) {
    notFound();
  }

  async function submitVoteAction(formData: FormData) {
    "use server";

    const supabase = createServerActionClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const formPollId = String(formData.get("poll_id") || "");
    const optionId = String(formData.get("option_id") || "");

    if (!formPollId || !optionId || formPollId !== pollRow.id) {
      redirect(`/polls/${params.id}?vote_error=invalid`);
    }

    if (!pollRow.is_active) {
      redirect(`/polls/${params.id}?vote_error=inactive`);
    }

    if (!pollRow.allow_anonymous_votes && !user) {
      // Route user to login, then back
      redirect(`/login?next=/polls/${params.id}`);
    }

    // Placeholder for actual vote persistence.
    // In a future step, insert into a poll_votes table and enforce RLS.

    redirect(`/polls/${params.id}?voted=1`);
  }

  const voted = searchParams?.voted === "1";
  const voteError = typeof searchParams?.vote_error === "string" ? (searchParams?.vote_error as string) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Poll Details</h1>
        <Link href="/polls">
          <Button variant="secondary">Back to Polls</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pollRow.title}
            {pollRow.is_active && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                title="Active"
                aria-label="Active"
              />
            )}
          </CardTitle>
          {pollRow.description && <CardDescription>{pollRow.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
            <span>
              Visibility: {pollRow.is_public ? (
                <span className="text-emerald-600">Public</span>
              ) : (
                <span className="text-amber-600">Private</span>
              )}
            </span>
            <span>
              Status: {pollRow.is_active ? (
                <span className="text-emerald-600">Active</span>
              ) : (
                <span className="text-muted-foreground">Inactive</span>
              )}
            </span>
            {pollRow.start_date && <span>Starts: {new Date(pollRow.start_date).toLocaleString()}</span>}
            {pollRow.end_date && <span>Ends: {new Date(pollRow.end_date).toLocaleString()}</span>}
            <span>Multiple votes: {pollRow.allow_multiple_votes ? "Allowed" : "Not allowed"}</span>
            <span>Anonymous votes: {pollRow.allow_anonymous_votes ? "Allowed" : "Not allowed"}</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Options</h2>
            {options.length === 0 ? (
              <p className="text-muted-foreground">No options available.</p>
            ) : (
              <ul className="list-disc pl-6 space-y-1">
                {options.map((opt) => (
                  <li key={opt.id}>{opt.text}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Voting UI */}
          {!voted ? (
            <div className="pt-2">
              {voteError && (
                <div className="mb-3 text-red-600">
                  {voteError === "invalid" && "Please select an option and try again."}
                  {voteError === "inactive" && "This poll is closed for voting."}
                  {!["invalid", "inactive"].includes(voteError) && "Unable to submit vote. Please try again."}
                </div>
              )}
              <form action={submitVoteAction} className="space-y-3">
                <input type="hidden" name="poll_id" value={pollRow.id} />
                <fieldset disabled={!pollRow.is_active || options.length === 0} className="space-y-2">
                  {options.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input type="radio" name="option_id" value={opt.id} required className="h-4 w-4" />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </fieldset>
                <Button type="submit" disabled={!pollRow.is_active || options.length === 0}>
                  Submit Vote
                </Button>
              </form>
            </div>
          ) : (
            <div className="pt-2">
              <div className="mb-3 text-emerald-700">Thank you for voting! Results coming soon.</div>
              <div className="flex items-center gap-2">
                <Link href="/polls">
                  <Button variant="secondary">Back to Polls</Button>
                </Link>
                {/* Placeholder for results page/link in future */}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}