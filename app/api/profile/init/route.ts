import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  // allow a-z, 0-9 and underscore; replace others with underscore
  s = s.normalize("NFKC").replace(/[^a-z0-9_]/g, "_");
  // collapse multiple underscores
  s = s.replace(/_+/g, "_");
  // trim leading/trailing underscores
  s = s.replace(/^_+|_+$/g, "");
  // enforce length bounds
  if (s.length < 3 || s.length > 30) return null;
  return s;
}

function deriveFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0] || "";
  return sanitizeUsername(local);
}

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Prefer provider-supplied username, fallback to email local part
  const rawUsername = (user.user_metadata as any)?.username;
  const username = sanitizeUsername(rawUsername) ?? deriveFromEmail(user.email) ?? null;

  const payload = {
    id: user.id,
    username,
    email: user.email ?? null,
    updated_at: new Date().toISOString(),
  } as const;

  // RLS should enforce id = auth.uid() for insert/update
  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    // Avoid leaking internal details; return generic error
    return NextResponse.json({ error: "profile_init_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username });
}