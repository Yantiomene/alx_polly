"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

/**
 * LoginPage
 * Purpose: Renders the login form and orchestrates the client-side authentication flow using Supabase.
 * Why needed in this app: Provides the entry point for existing users to access polls; on successful sign-in it triggers profile initialization so routes like /polls that depend on a user profile have consistent metadata.
 * Assumptions: Email/password authentication is enabled in Supabase; the /api/profile/init route exists and is idempotent; navigation to /polls is the post-login hub.
 * Edge cases: Invalid credentials, network failures, and profile initialization errors; the latter are intentionally swallowed to avoid blocking login UX.
 * Connections: Uses createClientComponentClient for Supabase, calls /api/profile/init on success, and navigates with next/navigation's router to /polls. UI is composed with Card, Input, Label, and Button components.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  /**
   * handleSignIn
   * Purpose: Handles form submission for login; signs in via Supabase, then fires server-side profile initialization and routes to /polls.
   * Assumptions: Email and password state values are bound to inputs; Supabase returns either a user or an error; profile init can safely be called multiple times.
   * Edge cases: Wrong password or unknown errors set a user-facing error message; fetch to /api/profile/init may fail and is intentionally ignored to avoid blocking navigation.
   * Connections: Bound to the form onSubmit and to the footer button onClick; integrates Supabase auth and the app's profile bootstrap API, then uses useRouter for navigation.
   * @param e React.FormEvent submission event to prevent default browser submit behavior.
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    try {
      const user = data?.user;
      if (user) {
        // Initialize profile via server route with validation/sanitization
        await fetch('/api/profile/init', { method: 'POST' });
      }
    } catch (_) {}
    setLoading(false);
    router.push('/polls');
  };

  return (
    <div className="w-full flex justify-center items-center h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Log in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Your email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button size="lg" className="w-full font-semibold" onClick={handleSignIn} disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don't yet have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}