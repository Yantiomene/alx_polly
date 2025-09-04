"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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