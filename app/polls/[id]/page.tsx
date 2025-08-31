import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
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

  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, text, order_index")
    .eq("poll_id", pollId)
    .order("order_index", { ascending: true });

  // If options error occurs we can still render the poll with empty options
  return { poll: poll as PollRow, options: (options || []) as OptionRow[] };
}

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pollId = params.id;
  const { poll, options } = await getPollWithOptions(pollId);

  if (!poll) {
    notFound();
  }

  // If the poll is private and the viewer is not the owner, don't leak existence
  if (!poll.is_public && poll.creator_id !== user?.id) {
    notFound();
  }

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
          {poll.description && (
            <CardDescription>{poll.description}</CardDescription>
          )}
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
            {poll.start_date && (
              <span>Starts: {new Date(poll.start_date).toLocaleString()}</span>
            )}
            {poll.end_date && (
              <span>Ends: {new Date(poll.end_date).toLocaleString()}</span>
            )}
            <span>
              Multiple votes: {poll.allow_multiple_votes ? "Allowed" : "Not allowed"}
            </span>
            <span>
              Anonymous votes: {poll.allow_anonymous_votes ? "Allowed" : "Not allowed"}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Options</h2>
            {options.length === 0 ? (
              <p className="text-muted-foreground">No options available.</p>
            ) : (
              <ul className="list-disc pl-6 space-y-1">
                {options.map((opt) => (
                  <li key={opt.id} className="">{opt.text}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Placeholder for future: voting UI */}
          <div className="pt-2">
            <Button disabled title="Voting coming soon">Vote</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}