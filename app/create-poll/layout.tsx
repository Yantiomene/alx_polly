import React from 'react';

/**
 * CreatePollLayout
 * Purpose: Provides a constrained container for the create poll flow so forms have consistent spacing and readability.
 * Why needed: Keeps create-poll pages visually aligned with the rest of the app while excluding global chrome not needed for focus.
 * Connections: Wraps app/create-poll/page.tsx and any nested steps related to poll creation.
 */
export default function CreatePollLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      {children}
    </div>
  );
}