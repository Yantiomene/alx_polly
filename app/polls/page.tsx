"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PollsPage() {
  const polls = [
    { id: '1', title: 'Favorite Programming Language?', description: 'Choose your favorite programming language.' },
    { id: '2', title: 'Best AI Framework?', description: 'Which AI framework do you prefer?' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Available Polls</h1>
      {polls.map((poll) => (
        <Card key={poll.id}>
          <CardHeader>
            <CardTitle>{poll.title}</CardTitle>
            <CardDescription>{poll.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>View Poll</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}