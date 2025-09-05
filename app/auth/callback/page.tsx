"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Auth callback page that finalizes sign-in and triggers profile initialization.
 *
 * Why: Ensures every successful auth flow is funneled through a server-controlled
 * profile provisioning step (/api/profile/init) before routing to the app.
 *
 * Assumptions:
 * - Supabase handles the auth exchange and exposes the session via getSession().
 *
 * Edge cases:
 * - If session is missing, user is redirected back to /login.
 * - Failures in profile init are non-fatal; the user can still proceed.
 *
 * Connections:
 * - /api/profile/init centralizes profile upsert with RLS protections.
 * - Complements the dedicated /login and /signup flows.
 */
export default function CallbackPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // Initialize profile via server route with validation/sanitization
        try {
          await fetch("/api/profile/init", { method: "POST" });
        } catch (_) {
          // ignore profile init errors; user proceeds anyway
        }
        router.replace('/polls');
      } else {
        router.replace('/login');
      }
    };

    handleAuthCallback();
  }, [supabase, router]);

  return (
    <div>
      <p>Processing authentication...</p>
    </div>
  );
}