'use client'
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PollRow, OptionRow, VoteRow } from "@/lib/types";
import {
  computeCounts,
  getVoteCookieKey,
} from "@/lib/polls";
import {
  canVote,
} from "@/lib/vote-rules";

export default function PollDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [votesError, setVotesError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  const voted = searchParams.get("voted") === "1";
  const voteError = searchParams.get("vote_error");
  const voteErrorCode = searchParams.get("code");

  useEffect(() => {
    const supabase = createClientComponentClient();
    const fetchPoll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select(
          "id, title, description, start_date, end_date, allow_multiple_votes, allow_anonymous_votes, is_public, is_active, creator_id"
        )
        .eq("id", params.id)
        .single();

      if (pollError || !pollData) {
        notFound();
        return;
      }

      const { data: optionsData, error: optionsError } = await supabase
        .from("poll_options")
        .select("id, text, order_index, vote_count")
        .eq("poll_id", params.id)
        .order("order_index", { ascending: true });

      const { data: votesData, error: vErr } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", params.id);

      setPoll(pollData as PollRow);
      setOptions((optionsData || []) as OptionRow[]);
      setVotes((votesData || []) as VoteRow[]);
      setVotesError(Boolean(vErr));

      if (user) {
        const { data: existing } = await supabase
          .from("votes")
          .select("id")
          .eq("poll_id", pollData.id)
          .eq("voter_id", user.id)
          .limit(1);
        setAlreadyVoted(Boolean(existing && existing.length > 0));
      } else {
        const cookieStore = document.cookie;
        setAlreadyVoted(cookieStore.includes(getVoteCookieKey(pollData.id)));
      }

      setLoading(false);
    };

    fetchPoll();
  }, [params.id, notFound]);

  const submitVoteAction = async (formData: FormData) => {
    const optionId = formData.get("option_id");
    const pollId = formData.get("poll_id");

    const response = await fetch("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ poll_id: pollId, option_id: optionId }),
    });

    if (response.ok) {
      router.push(`/polls/${params.id}?voted=1`);
    } else {
      const { error } = await response.json();
      router.push(`/polls/${params.id}?vote_error=${error}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!poll) {
    return <div>Poll not found.</div>;
  }

  const isOwner = poll.creator_id === user?.id;
  const { countsMap, totalVotes } = computeCounts(options as OptionRow[], votes as VoteRow[], !!votesError);
  const canVoteNow = canVote(poll, options.length, alreadyVoted);
  const showResults = isOwner || voted || alreadyVoted;
  const showForm = !showResults && canVoteNow;

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
            {poll.title}
            {poll.is_active && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                title="Active"
                aria-label="Active"
              />
            )}
          </CardTitle>
          {poll.description && <CardDescription>{poll.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
            <span>
              Visibility: {poll.is_public ? (
                <span className="text-emerald-600">Public</span>
              ) : (
                <span className="text-amber-600">Private</span>
              )}
            </span>
            <span>
              Status: {poll.is_active ? (
                <span className="text-emerald-600">Active</span>
              ) : (
                <span className="text-muted-foreground">Inactive</span>
              )}
            </span>
            {poll.start_date && <span>Starts: {new Date(poll.start_date).toLocaleString()}</span>}
            {poll.end_date && <span>Ends: {new Date(poll.end_date).toLocaleString()}</span>}
            <span>Multiple votes: {poll.allow_multiple_votes ? "Allowed" : "Not allowed"}</span>
            <span>Anonymous votes: {poll.allow_anonymous_votes ? "Allowed" : "Not allowed"}</span>
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
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                submitVoteAction(formData);
              }} className="space-y-3">
                <input type="hidden" name="poll_id" value={poll.id} />
                <fieldset disabled={!poll.is_active || options.length === 0} className="space-y-2">
                  {options.map((opt: OptionRow) => (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input type="radio" name="option_id" value={opt.id} required className="h-4 w-4" />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </fieldset>
                <Button type="submit">Submit Vote</Button>
              </form>
            </div>
          ) : (
            resultsSection
          )}

          {isOwner && (
            <div>
              <Link href={`/polls/${poll.id}/edit`}>
                <Button variant="secondary">Edit Poll</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
