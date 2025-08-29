"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/components/auth-context';

export default function CreatePollPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="title">Poll Title</Label>
            <Input id="title" placeholder="Enter your poll question" />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" placeholder="Add a description for your poll" />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="option1">Option 1</Label>
            <Input id="option1" placeholder="Option A" />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="option2">Option 2</Label>
            <Input id="option2" placeholder="Option B" />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button>Create Poll</Button>
      </CardFooter>
    </Card>
  );
}