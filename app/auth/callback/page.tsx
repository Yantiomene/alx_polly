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
        router.replace('/polls');
      } else {
        router.replace('/auth');
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