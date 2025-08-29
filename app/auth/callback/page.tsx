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
        // Ensure profile exists after email confirmation
        const user = data.session.user;
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            username: (user.user_metadata as any)?.username ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (_) {
          // ignore upsert errors in callback; user will proceed anyway
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