import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { randomUUID } from "crypto";
import type { PollRow, OptionRow, VoteRow } from "@/lib/types";
import {
  getPollWithOptionsById,
  hasAlreadyVoted,
  computeCounts,
  getVoteCookieKey,
} from "@/lib/polls";
import {
  shouldBlockVoteWhenSingleAllowed,
  isAnonymousVoteAllowed,
  canVote,
} from "@/lib/vote-rules";

/**
 * Server-rendered detail page for viewing a single poll, voting, and seeing results.
 *
 * Why: Concentrates permission checks, policy rules, and data loading on the server to ensure
 * correctness under RLS, while providing a simple client UI. Determines whether to show the
 * voting form or the results based on ownership and prior voting state.
 *
 * Assumptions:
 * - getPollWithOptionsById returns poll, options, and votes respecting RLS.
 * - Non-public polls are only viewable by the owner.
 *
 * Edge cases:
 * - Missing poll results in a 404 via notFound().
 * - Vote analytics fall back gracefully when RLS prevents reading votes.
 *
 * Connections:
 * - Uses vote rules helpers (canVote, isAnonymousVoteAllowed, shouldBlockVoteWhenSingleAllowed)
 *   and polls helpers (hasAlreadyVoted, computeCounts, getVoteCookieKey).
 */
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
  const { poll, options, votes, votesError } = await getPollWithOptionsById(supabase as any, pollId);

  if (!poll) {
    notFound();
  }

  const pollRow: PollRow = poll as PollRow;
  const isOwner = pollRow.creator_id === user?.id;

  if (!pollRow.is_public && !isOwner) {
    notFound();
  }

  // Determine if the current viewer has already voted
  const cookieStore = await cookies();
  const alreadyVoted = await hasAlreadyVoted(
    supabase as any,
    pollRow.id,
    user?.id ?? null,
    cookieStore as any
  );

  const voted = searchParams?.voted === "1";
  const voteError = typeof searchParams?.vote_error === "string" ? (searchParams?.vote_error as string) : undefined;
  const voteErrorCode = typeof searchParams?.code === "string" ? (searchParams?.code as string) : undefined;

  // Compute analytics counts once
  const { countsMap, totalVotes } = computeCounts(options as OptionRow[], votes as VoteRow[], !!votesError);

  const canVoteNow = canVote(pollRow, options.length, alreadyVoted);
  const showResults = isOwner || voted || alreadyVoted;
  const showForm = !showResults && canVoteNow;

  /**
   * Server action to validate and persist a user's vote for the poll.
   *
   * Why: Enforces policy (single vote, anonymous rules), integrity (valid option), and security
   * (creator cannot elevate permissions) at the server boundary. Also sets a cookie for
   * anonymous voters to prevent duplicate votes.
   *
   * Assumptions:
   * - FormData contains poll_id and option_id fields.
   * - Row Level Security protects writes to the votes table appropriately.
   *
   * Edge cases:
   * - Invalid form data, inactive polls, invalid options, or duplicate votes redirect to
   *   contextual error states.
   * - Insert failures propagate with an error code for troubleshooting.
   *
   * Connections:
   * - Uses vote-rules helpers, hasAlreadyVoted, and getVoteCookieKey to coordinate state.
   */
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

    if (!isAnonymousVoteAllowed(pollRow) && !user) {
      redirect(`/login?next=/polls/${params.id}`);
    }

    const validOption = (options || []).some((o) => o.id === optionId);
    if (!validOption) {
      redirect(`/polls/${params.id}?vote_error=invalid`);
    }

    // Prevent duplicate vote when multiple votes are not allowed
    if (!pollRow.allow_multiple_votes) {
      const cookieStore = await cookies();
      const alreadyVotedNow = await hasAlreadyVoted(
        supabase as any,
        pollRow.id,
        user?.id ?? null,
        cookieStore as any
      );
      if (shouldBlockVoteWhenSingleAllowed(pollRow, alreadyVotedNow)) {
        redirect(`/polls/${params.id}?voted=1&dup=1`);
      }
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

    // Mark anonymous users as having voted using a cookie
    if (!user?.id) {
      const cookieStore = await cookies();
      cookieStore.set(getVoteCookieKey(pollRow.id), "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }

    redirect(`/polls/${params.id}?voted=1`);
  }

  const resultsSection = (
    <div>
      <h3 className="text-lg font-semibold mb-2">Results</h3>
      {votesError ? (
        <p className="text-amber-600">Results are currently unavailable due to permissions. Falling back to cached counts.</p>
      ) : null}
      {options.length === 0 ? (
        <p className="text-muted-foreground">No options to show results for.</p>
      ) : (
        <div className="space-y-2">
          {options.map((opt: OptionRow) => {
            const c = countsMap.get(opt.id) || 0;
            const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{opt.text}</span>
                  <span>
                    {c} ({pct}%)
                  </span>
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
  );

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
                {options.map((opt: OptionRow) => (
                  <li key={opt.id}>{opt.text}</li>
                ))}
              </ul>
            )}
          </div>

          {showForm ? (
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
                  {options.map((opt: OptionRow) => (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input type="radio" name="option_id" value={opt.id} required className="h-4 w-4" />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </fieldset>
              </form>
            </div>
          ) : (
            resultsSection
          )}

          {isOwner && (
            <div>
              <Link href={`/polls/${pollRow.id}/edit`}>
                <Button variant="secondary">Edit Poll</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}