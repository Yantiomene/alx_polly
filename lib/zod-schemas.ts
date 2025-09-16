// @ts-nocheck
import { z } from "zod";

// Zod schemas for Supabase tables used in this project
// Tables: profiles, polls, poll_options, votes

// profiles table
export const profilesSchema = z.object({
  id: z.string().uuid(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]{3,30}$/, "letters, digits, and underscore only")
    .nullable(),
  email: z.string().email().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
});
export type Profiles = z.infer<typeof profilesSchema>;

// polls table
export const pollsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  creator_id: z.string().uuid(),
  is_public: z.boolean(),
  is_active: z.boolean(),
  allow_multiple_votes: z.boolean(),
  allow_anonymous_votes: z.boolean(),
  start_date: z.string().datetime().nullable(),
  end_date: z.string().datetime().nullable(),
  view_count: z.number().int().nonnegative(),
  vote_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Poll = z.infer<typeof pollsSchema>;

// poll_options table
export const pollOptionsSchema = z.object({
  id: z.string().uuid(),
  poll_id: z.string().uuid(),
  text: z.string().min(1).max(300),
  order_index: z.number().int().min(0),
  // Denormalized cached count
  vote_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PollOption = z.infer<typeof pollOptionsSchema>;

// votes table
export const votesSchema = z.object({
  id: z.string().uuid(),
  poll_id: z.string().uuid(),
  option_id: z.string().uuid(),
  voter_id: z.string().uuid().nullable(),
  voter_ip: z.string().nullable(),
  voter_fingerprint: z.string().nullable(),
  user_agent: z.string().nullable(),
  session_id: z.string().nullable(),
  vote_hash: z.string(),
  is_valid: z.boolean(),
  is_anonymous: z.boolean().nullable(),
  created_at: z.string().datetime(),
});
export type Vote = z.infer<typeof votesSchema>;