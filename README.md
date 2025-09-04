This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Preview

![Landing page screenshot](./images/Image%2029-08-2025%20%C3%A0%2022.29.jpg)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Security Audit and Hardening Guide

This section documents the security issues identified in the authentication and profile initialization flows, along with the implemented and recommended remediations.

### Summary of Findings
- Client-side profile upserts in Login and immediate-session Sign-up
  - Where: <mcfile name="page.tsx" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/login/page.tsx"></mcfile> and the immediate-session branch in <mcfile name="page.tsx" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/signup/page.tsx"></mcfile>
  - Risk: Relies on untrusted client inputs (e.g., user_metadata.username). Even with RLS, this can store unsanitized usernames and diverge from server validation.
  - Status: Replace with a call to the server-controlled initializer.

- Username normalization mismatch (client vs server)
  - Client allows `^[a-zA-Z0-9_]{3,30}$` while server sanitizer normalizes to lowercase and NFKC.
  - Risk: Unexpected casing changes and potential uniqueness collisions (e.g., "Alice" vs "alice").
  - Status: Align client validation with server sanitizer.

- Username uniqueness handling in server route
  - Where: <mcfile name="route.ts" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/api/profile/init/route.ts"></mcfile>
  - Risk: On unique constraint conflict, route returns generic 500; lacks deterministic conflict handling.
  - Status: Handle conflicts (e.g., 409 response or auto-suffix strategy).

- Pre-flight username availability check
  - Where: <mcfile name="page.tsx" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/signup/page.tsx"></mcfile>
  - Risk: Racy and can enable username enumeration. Server enforcement must be final.
  - Status: Keep for UX but add basic rate limiting.

- CSRF considerations for `/api/profile/init`
  - Current design is idempotent and derives all values from the server session; low risk.
  - Status: Enforce method checks; add CSRF token only if future inputs are accepted.

- Tokens/credentials handling
  - Tokens are managed via Supabase helpers (httpOnly cookies) in correct contexts (client/server/middleware). No tokens are logged or stored in localStorage.
  - Status: No issues found.

### Remediations Implemented
- Server-controlled profile initialization route
  - File: <mcfile name="route.ts" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/api/profile/init/route.ts"></mcfile>
  - Behavior: Authenticates via server cookies; validates/sanitizes username (NFKC, lowercase, `a-z0-9_`, 3–30 chars); optional fallback from email local-part; upserts `profiles` with `id = auth.uid()` under RLS.
- Auth callback updated to use server route
  - File: <mcfile name="page.tsx" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/auth/callback/page.tsx"></mcfile>
  - Behavior: POSTs to `/api/profile/init` on session presence, then redirects. No client-side profile writes.

### Remediations Pending (Action Items)
1) Replace client-side profile upserts with server call
   - Update <mcfile name="page.tsx" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/login/page.tsx"></mcfile> to `POST /api/profile/init` after successful sign-in.
   - Update immediate-session branch in <mcfile name="page.tsx" path="/Users/macbookpro/Documents/Applied AI/alx-polly/app/signup/page.tsx"></mcfile> to call the same route.

2) Align client username validation with server sanitizer
   - Enforce lowercase on input (e.g., display-as-you-type transform) or convert to lowercase before submission and update UI messaging.

3) Handle username uniqueness deterministically in the server route
   - On conflict, return `409 Conflict` with guidance, or auto-resolve by appending a short suffix and return the resolved username.

4) Add reserved usernames list
   - Disallow values like `admin`, `root`, `support`, `help`, `security`, etc., within the sanitizer.

5) Add basic rate limiting
   - Apply to username availability checks and `/api/profile/init` to mitigate abuse/enumeration.

6) Add tests
   - Unit tests for the sanitizer (normalization, allowed chars, length bounds, reserved words).
   - Integration tests for the route (auth required, upsert success, uniqueness conflicts).
   - E2E coverage for sign-up/login flows including callback and profile initialization.

### Database/RLS Checklist
- `profiles` table policies
  - Insert/Update: `auth.uid() = id` only.
  - Select: consider restricting sensitive fields; allow public read of non-sensitive fields if needed.
  - Constraints: unique index on `username`; optional CHECK for basic format (still keep server sanitizer as primary gate).

### Notes on Architecture
- Although the project prefers Server Actions over API routes for simple CRUD, `/api/profile/init` is a deliberate exception to centralize validation, normalization, and auditing for identity-related data.

### Secrets and Environment
- Never embed service-role keys in client bundles. Keep public URL and anon key on the client only. Ensure all sensitive keys remain server-side via environment variables.
