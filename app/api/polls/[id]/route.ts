
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {NextResponse} from "next/server";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pollId = params.id;
  const body = await request.json();

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const allowMultipleVotes = body.allow_multiple_votes === true;
  const allowAnonymousVotes = body.allow_anonymous_votes === true;
  const isPublic = body.is_public === true;
  const isActive = body.is_active === true;
  const startDateRaw = String(body.start_date || "").trim();
  const endDateRaw = String(body.end_date || "").trim();

  const rawIds = (body.option_ids || []).map((v: any) => String(v || ""));
  const rawTexts = (body.options || []).map((v: any) => String(v || "").trim());

  const submittedOptions = rawTexts
    .map((text, idx) => ({ id: rawIds[idx] || null, text, order_index: idx }))
    .filter((o) => !!o.text);

  if (!title || submittedOptions.length < 2) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Failed to update poll" }, { status: 500 });
  }

  const { data: existingOptions, error: loadOptsError } = await supabase
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId);

  if (loadOptsError) {
    return NextResponse.json({ error: "Failed to update options" }, { status: 500 });
  }

  const submittedIds = new Set(submittedOptions.filter((s) => !!s.id).map((s) => s.id as string));

  const toDelete = (existingOptions || [])
    .filter((o) => !submittedIds.has(o.id))
    .map((o) => o.id);

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("poll_options")
      .delete()
      .in("id", toDelete)
      .eq("poll_id", pollId);
    if (delErr) {
      return NextResponse.json({ error: "Failed to update options" }, { status: 500 });
    }
  }

  for (const s of submittedOptions) {
    if (s.id) {
      const { error: upErr } = await supabase
        .from("poll_options")
        .update({ text: s.text, order_index: s.order_index })
        .eq("id", s.id)
        .eq("poll_id", pollId);
      if (upErr) {
        return NextResponse.json({ error: "Failed to update options" }, { status: 500 });
      }
    }
  }

  const newRows = submittedOptions
    .filter((s) => !s.id)
    .map((s) => ({ poll_id: pollId, text: s.text, order_index: s.order_index }));

  if (newRows.length > 0) {
    const { error: insErr } = await supabase.from("poll_options").insert(newRows);
    if (insErr) {
      return NextResponse.json({ error: "Failed to update options" }, { status: 500 });
    }
  }

  return NextResponse.json({ pollId });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const supabase = createRouteHandlerClient({ cookies });
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pollId = params.id;

    const { error: deleteOptionsError } = await supabase
        .from("poll_options")
        .delete()
        .eq("poll_id", pollId);

    if (deleteOptionsError) {
        return NextResponse.json({ error: "Failed to delete poll options" }, { status: 500 });
    }

    const { error: deletePollError } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId)
        .eq("creator_id", user.id);

    if (deletePollError) {
        return NextResponse.json({ error: "Failed to delete poll" }, { status: 500 });
    }

    return NextResponse.json({ message: "Poll deleted successfully" });
}
