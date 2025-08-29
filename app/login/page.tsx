"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') === 'sign-up' ? 'sign-up' : 'sign-in';
  const [view, setView] = useState<'sign-in' | 'sign-up'>(initialView);
  const supabase = createClientComponentClient();

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