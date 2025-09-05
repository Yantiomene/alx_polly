"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Combined auth page providing basic email/password sign-in and sign-up forms.
 *
 * Why: A lightweight fallback/alternative to the dedicated /login and /signup flows.
 * This component intentionally does not perform profile initialization; that is handled
 * by /auth/callback and /login to centralize profile provisioning via /api/profile/init.
 *
 * Connections:
 * - Redirect target for email link: /auth/callback, which calls /api/profile/init.
 * - Uses Supabase client to trigger auth flows; no direct DB writes here.
 */
export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const useSearch = useSearchParams();
  const initialView = useSearch.get('view') === 'sign-up' ? 'sign-up' : 'sign-in';
  const [view, setView] = useState<'sign-in' | 'sign-up'>(initialView);
  const supabase = createClientComponentClient();

  /**
   * Submit handler for sign-up using email/password.
   *
   * Assumptions:
   * - Supabase will send a verification email that redirects to /auth/callback.
   * - Profile initialization occurs on callback, not here.
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  /**
   * Submit handler for sign-in using email/password.
   *
   * Assumptions:
   * - On success, session exists and subsequent navigation triggers profile init on pages
   *   that call /api/profile/init (e.g., /login flow). This page itself does not call it.
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{view === 'sign-in' ? 'Login' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {view === 'sign-in' ? 'Log in to your account.' : 'Create a new account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={view === 'sign-in' ? handleSignIn : handleSignUp}>
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
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        {view === 'sign-in' ? (
          <>
            <Button variant="outline" onClick={() => setView('sign-up')}>Sign Up</Button>
            <Button onClick={handleSignIn}>Login</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setView('sign-in')}>Login</Button>
            <Button onClick={handleSignUp}>Sign Up</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}