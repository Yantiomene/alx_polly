
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {NextResponse} from "next/server";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const allowMultipleVotes = body.allow_multiple_votes === true;
  const allowAnonymousVotes = body.allow_anonymous_votes === true;
  const startDateRaw = String(body.start_date || "").trim();
  const endDateRaw = String(body.end_date || "").trim();

  const optionValues = (body.options || [])
    .map((o: any) => String(o).trim())
    .filter(Boolean);

  if (!title || optionValues.length < 2) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
  }

  const optionRows = optionValues.map((text: string, idx: number) => ({
    poll_id: poll.id,
    text,
    order_index: idx,
  }));

  const { error: optionsError } = await supabase.from("poll_options").insert(optionRows);

  if (optionsError) {
    await supabase.from("polls").delete().eq("id", poll.id);
    return NextResponse.json({ error: "Failed to create options" }, { status: 500 });
  }

  return NextResponse.json({ pollId: poll.id });
}
