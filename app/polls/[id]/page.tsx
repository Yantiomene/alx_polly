import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { randomUUID } from "crypto";

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
  vote_count?: number; // from schema
};

type VoteRow = { option_id: string };

async function getPollWithOptions(
  pollId: string
): Promise<{ poll: PollRow | null; options: OptionRow[]; votes: VoteRow[]; votesError: boolean }> {
  const supabase = createServerComponentClient({ cookies });

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      "id, title, description, start_date, end_date, allow_multiple_votes, allow_anonymous_votes, is_public, is_active, creator_id"
    )
    .eq("id", pollId)
    .single();

  if (pollError || !poll) return { poll: null, options: [], votes: [], votesError: false };

  const { data: options } = await supabase
    .from("poll_options")
    .select("id, text, order_index, vote_count")
    .eq("poll_id", pollId)
    .order("order_index", { ascending: true });

  const { data: votesData, error: vErr } = await supabase
    .from("votes")
    .select("option_id")
    .eq("poll_id", pollId);

  return {
    poll: poll as PollRow,
    options: (options || []) as OptionRow[],
    votes: (votesData || []) as VoteRow[],
    votesError: Boolean(vErr),
  };
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
  const { poll, options, votes, votesError } = await getPollWithOptions(pollId);

  if (!poll) {
    notFound();
  }

  const pollRow: PollRow = poll as PollRow;
  const isOwner = pollRow.creator_id === user?.id;

  if (!pollRow.is_public && !isOwner) {
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
      redirect(`/login?next=/polls/${params.id}`);
    }

    const validOption = (options || []).some((o) => o.id === optionId);
    if (!validOption) {
      redirect(`/polls/${params.id}?vote_error=invalid`);
    }

    const { error: insErr } = await supabase.from("votes").insert({
      poll_id: pollRow.id,
      option_id: optionId,
      voter_id: user?.id ?? null,
      vote_hash: randomUUID(),
      is_valid: true,
      // Do NOT set is_anonymous because the column is GENERATED ALWAYS in your schema
    } as any);

    if (insErr) {
      console.error("votes insert failed", insErr);
      const code = (insErr as any).code || "unknown";
      redirect(`/polls/${params.id}?vote_error=save_failed&code=${encodeURIComponent(String(code))}`);
    }

    redirect(`/polls/${params.id}?voted=1`);
  }

  const voted = searchParams?.voted === "1";
  const voteError = typeof searchParams?.vote_error === "string" ? (searchParams?.vote_error as string) : undefined;
  const voteErrorCode = typeof searchParams?.code === "string" ? (searchParams?.code as string) : undefined;

  // Prepare analytics. Prefer live aggregation from votes; fallback to poll_options.vote_count
  const countsMap = new Map<string, number>();
  if (!votesError && votes && votes.length) {
    for (const v of votes) {
      const prev = countsMap.get(v.option_id) || 0;
      countsMap.set(v.option_id, prev + 1);
    }
  } else {
    for (const opt of options || []) {
      countsMap.set(opt.id, Number(opt.vote_count ?? 0));
    }
  }
  const totalVotes = Array.from(countsMap.values()).reduce((acc, n) => acc + n, 0);

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
            <div className="pt-2 space-y-4">
              {voteError && (
                <div className="mb-3 text-red-600">
                  {voteError === "invalid" && "Please select an option and try again."}
                  {voteError === "inactive" && "This poll is closed for voting."}
                  {voteError === "save_failed" && (
                    <>
                      Unable to save your vote. Please try again.
                      {voteErrorCode && (
                        <span className="block text-xs text-muted-foreground">Error code: {voteErrorCode}</span>
                      )}
                    </>
                  )}
                  {!["invalid", "inactive", "save_failed"].includes(voteError) && "Unable to submit vote. Please try again."}
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

              {/* Creator can see results without voting */}
              {isOwner && (
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-2">Results</h3>
                  {votesError ? (
                    <p className="text-amber-600">Results are currently unavailable due to permissions. Falling back to cached counts.</p>
                  ) : null}
                  {options.length === 0 ? (
                    <p className="text-muted-foreground">No options to show results for.</p>
                  ) : (
                    <div className="space-y-2">
                      {options.map((opt) => {
                        const c = countsMap.get(opt.id) || 0;
                        const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
                        return (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{opt.text}</span>
                              <span>{c} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded">
                              <div className="h-2 bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="text-sm text-muted-foreground">Total votes: {totalVotes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 space-y-4">
              <div className="mb-3 text-emerald-700">Thank you for voting!</div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Results</h3>
                {votesError ? (
                  <p className="text-amber-600">Results are currently unavailable due to permissions. Falling back to cached counts.</p>
                ) : null}
                {options.length === 0 ? (
                  <p className="text-muted-foreground">No options to show results for.</p>
                ) : (
                  <div className="space-y-2">
                    {options.map((opt) => {
                      const c = countsMap.get(opt.id) || 0;
                      const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
                      return (
                        <div key={opt.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{opt.text}</span>
                            <span>{c} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded">
                            <div className="h-2 bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-sm text-muted-foreground">Total votes: {totalVotes}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href="/polls">
                  <Button variant="secondary">Back to Polls</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}