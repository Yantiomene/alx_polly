import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Normalize and validate a proposed username using strict server-side rules.
 *
 * Why: Ensures a single source of truth for username format so clients cannot bypass validation,
 * preventing inconsistent data and potential injection via unexpected Unicode or symbols.
 *
 * Assumptions:
 * - Input may come from OAuth provider metadata (user_metadata.username) or user-typed values.
 * - Accepts only lowercase a–z, digits, and underscore; applies NFKC to fold Unicode.
 *
 * Edge cases handled:
 * - Non-string inputs return null.
 * - Trims whitespace, lowercases, collapses multiple underscores, and trims leading/trailing underscores.
 * - Enforces length [3, 30]; returns null when outside bounds.
 *
 * Connections:
 * - Used by POST() in this route to sanitize provider username and to derive from email.
 * - Mirrors the client-side regex used on the SignUp page to keep UX aligned with server constraints.
 */
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

/**
 * Fallback to a username derived from the email local part when no provider username is set.
 *
 * Why: Guarantees newly authenticated users can be provisioned with a safe default username
 * even if the identity provider does not supply one.
 *
 * Assumptions:
 * - Email is a standard address containing a local part before '@'.
 *
 * Edge cases:
 * - Null/undefined email returns null.
 * - Delegates final validation to sanitizeUsername to enforce the same rules.
 *
 * Connections:
 * - Called by POST() when provider metadata does not include a valid username.
 */
function deriveFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0] || "";
  return sanitizeUsername(local);
}

/**
 * POST /api/profile/init — Initializes or updates the authenticated user's profile row.
 *
 * Why: Centralizes profile provisioning behind Row Level Security, removing client-side upserts
 * and ensuring normalization/validation occur server-side on every login or immediate-session signup.
 *
 * Assumptions:
 * - A "profiles" table exists with RLS enforcing id = auth.uid() for insert/update.
 * - Supabase auth session is available via cookies in this route handler context.
 *
 * Edge cases:
 * - 401 when no user session is present.
 * - On database errors, returns a generic 500 error code (profile_init_failed) without leaking details.
 *
 * Connections:
 * - Invoked by Login and Auth Callback flows, as well as immediate-session sign-ups from the SignUp page.
 * - Keeps client-side username validation in sync by returning the finalized username.
 */
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