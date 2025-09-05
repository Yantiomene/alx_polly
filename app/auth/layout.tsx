import React from 'react';

/**
 * AuthLayout
 * Purpose: Provides a minimal, centered layout for auth-related pages (login, signup, callback).
 * Why needed: Separates authentication flows from the main app shell (Navbar, etc.) for focus and reduced distraction.
 * Assumptions: Children are auth pages that handle their own state and navigation.
 * Connections: Used by routes under /auth, /login, and /signup to present a consistent authentication UI wrapper.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}