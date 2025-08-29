'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setInfo(null);

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError('Please provide a username');
      return;
    }

    // Enforce DB username format on client to prevent trigger/DB errors
    const usernameOk = /^[a-zA-Z0-9_]{3,30}$/.test(trimmedUsername);
    if (!usernameOk) {
      setError('Username must be 3–30 chars and use only letters, numbers, and underscore.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // 1) Username uniqueness check in profiles
      const { data: existingUser, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (usernameCheckError) {
        // A real network/db error occurred
        setError('Unable to verify username availability. Please try again.');
        return;
      }

      if (existingUser) {
        setError('Username is already taken. Please choose another.');
        return;
      }

      // 2) Attempt sign-up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: { username: trimmedUsername, email },
        },
      });

      if (error) {
        // Provide clearer message for duplicate email
        const duplicateEmail = (error as any)?.status === 422 || /already registered/i.test(error.message);
        setError(duplicateEmail ? 'Email is already registered. Try logging in.' : error.message);
        return;
      }

      // If we have a user session immediately (email confirmations disabled), create the profile row now
      if (data?.user && data?.session) {
        await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              username: trimmedUsername,
              email: data.user.email ?? email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        router.push('/polls');
        return;
      }

      // If no immediate session but we do have a user, confirmation email should have been sent by Supabase.
      if (data?.user && !data?.session) {
        // Optionally attempt a resend to ensure email dispatch; if it fails, surface error instead of success UI.
        if (typeof (supabase.auth as any).resend === 'function') {
          const { error: resendError } = await (supabase.auth as any).resend({ type: 'signup', email });
          if (resendError) {
            setError('We created your account but could not send the verification email. Please try again.');
            return;
          }
        }
        setVerificationSent(true);
        return;
      }

      // Fallback: unexpected response shape
      setError('Sign up failed. Please try again.');
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error during sign up');
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="w-full flex justify-center items-center h-screen">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              Thanks! Please check your email to confirm your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your details below to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                required
                onChange={(e) => setUsername(e.target.value)}
                value={username}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                onChange={(e) => setEmail(e.target.value)}
                value={email}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                onChange={(e) => setPassword(e.target.value)}
                value={password}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
            {info && (
              <p className="text-sm text-green-600" role="status">{info}</p>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button size="lg" className="w-full font-semibold" onClick={handleSignUp} disabled={loading}>
            {loading ? 'Creating account…' : 'Sign Up'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">Login</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}