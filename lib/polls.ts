// Removed server-only imports to keep this module usable in client components
import type { PollRow, OptionRow, VoteRow } from "./types";

// Minimal Supabase client shape used here
export type SupabaseClientLike = {
  from: (table: string) => any;
};

// Minimal cookie store shape used by our helpers (for server usage)
export type SimpleCookieStore = {
  get(name: string): { value?: string } | undefined;
};

export async function getPollWithOptionsById(
  supabase: SupabaseClientLike,
  pollId: string
): Promise<{ poll: PollRow | null; options: OptionRow[]; votes: VoteRow[]; votesError: boolean }> {
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

export function getVoteCookieKey(pollId: string): string {
  return `voted_poll_${pollId}`;
}

function readClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";").shift();
  return undefined;
}

export async function hasAlreadyVoted(
  supabase: SupabaseClientLike,
  pollId: string,
  userId: string | null,
  cookieStore?: SimpleCookieStore
): Promise<boolean> {
  if (userId) {
    const { data: existing } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("voter_id", userId)
      .limit(1);
    return Boolean(existing && existing.length > 0);
  }

  // Anonymous user: check via cookie
  // Prefer client-side document.cookie when available; otherwise rely on provided server cookieStore.
  const key = getVoteCookieKey(pollId);
  if (typeof window !== "undefined") {
    return readClientCookie(key) === "1";
  }
  if (cookieStore) {
    return cookieStore.get(key)?.value === "1";
  }
  return false;
}

export function computeCounts(
  options: OptionRow[],
  votes: VoteRow[],
  votesError: boolean
): { countsMap: Map<string, number>; totalVotes: number } {
  const countsMap = new Map<string, number>();

  if (!votesError) {
    // Initialize all option counts to 0 to ensure consistent display even with zero votes
    for (const opt of options || []) {
      countsMap.set(opt.id, 0);
    }
    // Increment counts from live votes (may be an empty array, which is fine)
    for (const v of votes || []) {
      const prev = countsMap.get(v.option_id) || 0;
      countsMap.set(v.option_id, prev + 1);
    }
  } else {
    // Fall back to denormalized/cached counts when votes are not readable due to RLS
    for (const opt of options || []) {
      countsMap.set(opt.id, Number(opt.vote_count ?? 0));
    }
  }

  const totalVotes = Array.from(countsMap.values()).reduce((acc, n) => acc + n, 0);
  return { countsMap, totalVotes };
}