
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {NextResponse} from "next/server";
import {randomUUID} from "crypto";

export async function POST(request: Request) {
    const supabase = createRouteHandlerClient({ cookies });
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();

    const pollId = String(body.poll_id || "");
    const optionId = String(body.option_id || "");

    if (!pollId || !optionId) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data: poll, error: pollError } = await supabase
        .from("polls")
        .select("id, is_active, allow_anonymous_votes, allow_multiple_votes")
        .eq("id", pollId)
        .single();

    if (pollError || !poll) {
        return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (!poll.is_active) {
        return NextResponse.json({ error: "Poll is not active" }, { status: 400 });
    }

    if (!poll.allow_anonymous_votes && !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: insErr } = await supabase.from("votes").insert({
        poll_id: poll.id,
        option_id: optionId,
        voter_id: user?.id ?? null,
        vote_hash: randomUUID(),
        is_valid: true,
    } as any);

    if (insErr) {
        console.error("votes insert failed", insErr);
        const code = (insErr as any).code || "unknown";
        return NextResponse.json({ error: `Failed to save vote: ${code}` }, { status: 500 });
    }

    if (!user?.id) {
        cookies().set(getVoteCookieKey(poll.id), "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }

    return NextResponse.json({ message: "Vote submitted successfully" });
}

function getVoteCookieKey(pollId: string): string {
    return `voted_poll_${pollId}`;
}
