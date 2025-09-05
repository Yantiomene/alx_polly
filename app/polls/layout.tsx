import React from 'react';

/**
 * PollsLayout
 * Purpose: Provides a consistent container for the polls listing and detail pages for better spacing and readability.
 * Why needed: Ensures poll-related routes share a common layout distinct from the auth pages while still living under the main app shell.
 * Connections: Wraps app/polls/page.tsx and nested routes like /polls/[id] and /polls/[id]/edit.
 */
export default function PollsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      {children}
    </div>
  );
}