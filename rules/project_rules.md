---
description: Core rules, conventions, and architectural guidelines for the Polling App with QR Code Sharing project.
globs:
alwaysApply: true
---

## Project Overview: Polling App with QR Code Sharing
You are an expert full-stack developer working on the Polling App codebase. Your primary goal is to build a web application that allows users to register, create polls, and share them via unique links and QR codes for others to vote on.

Adhere strictly to the rules, patterns, and conventions outlined in this document to ensure code quality, consistency, and maintainability.

## Technology Stack
The project uses the following technologies. Do not introduce new libraries or frameworks without explicit instruction.

- Language: TypeScript
- Main Framework: Next.js 14+ (App Router)
- Database & Auth: Supabase with Row Level Security (RLS)
- Styling: Tailwind CSS with shadcn/ui components
- State Management: Server Components for server state, React hooks for client state.
- API Communication: Use Next.js Server Actions for mutations (creating polls, voting). Fetch data in Server Components using the Supabase client.
- QR Code Generation: qrcode library for server-side generation
- Real-time Updates: Supabase real-time subscription

## Architecture & Code Style

- Directory Structure: Follow the standard Next.js App Router structure.
    - `/app` for routes and pages.
    - `/components/ui` for `shadcn/ui` components.
    - `/components/` for custom, reusable components.
    - `/lib` for Supabase client setup, utility functions, and Server Actions.

- Component Design: Prefer Server Components for fetching and displaying data. Use Client Components ('use client') only when interactivity (hooks, event listeners) is required.
- Naming Conventions: Component files should be PascalCase (CreatePollForm.tsx, VotingInterface.tsx). Utility and action functions should be camelCase (submitVote.ts, pollData.ts), kebab-case for non-components (poll-validation.ts)
- Error Handling: Use try/catch blocks within Server Actions and Route Handlers. Use Next.js error.tsx files for handling errors within route segments.
- API Keys & Secrets: Never hardcode secrets. Use environment variables (.env.local) for Supabase URL and keys, accessed via process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.SUPABASE_SECRET_KEY.

## Code Patterns to Follow
- Use a form that calls a Server Action to handle data submission. This keeps client-side JavaScript minimal.
- Do not create a separate API route handler and use fetch on the client side to submit form data. Use Server Actions instead.
- Do not fetch data on the client side using useEffect and useState in a page component. Fetch data directly in a Server Component.

## Verification Checklist
Before finalizing any code, verify:

([]) Uses Next.js App Router with Server Components for data fetching
([]) Server Actions are used for form submissions and data mutations
([]) Supabase client is used correctly (server vs client context)
([]) shadcn/ui components are used for UI elements
([]) Environment variables are used for all secrets and configuration
([]) TypeScript types are properly defined and used
([]) Error handling is implemented at appropriate levels
([]) RLS policies are in place for data security
([]) Forms use react-hook-form with zod validation
([]) Real-time features use Supabase subscriptions appropriately
([]) Code follows the established naming conventions
([]) Components are properly organized in the directory structure

## Common Anti-Patterns to Avoid
❌ Don't create API routes for simple CRUD operations that can use Server Actions
❌ Don't fetch data with useEffect in components that could be Server Components
❌ Don't hardcode configuration values or API keys
❌ Don't create overly complex component hierarchies
❌ Don't ignore TypeScript errors or use any type
❌ Don't forget to implement proper loading and error states
❌ Don't skip input validation on the server side
❌ Don't expose sensitive database operations to the client
❌ Don't use client-side routing without proper prefetching
❌ Don't ignore Supabase real-time features