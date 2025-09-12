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
    .regex(/^[a-z0-9_]+$/, "lowercase letters, digits, and underscore only")
    .nullable(),
  email: z.string().email().nullable(),
  updated_at: z.string().datetime(),
});
export type Profiles = z.infer<typeof profilesSchema>;

// polls table
export const pollsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  start_date: z.string().datetime().nullable(),
  end_date: z.string().datetime().nullable(),
  allow_multiple_votes: z.boolean(),
  allow_anonymous_votes: z.boolean(),
  is_public: z.boolean(),
  is_active: z.boolean(),
  creator_id: z.string().uuid(),
});
export type Poll = z.infer<typeof pollsSchema>;

// poll_options table
export const pollOptionsSchema = z.object({
  id: z.string().uuid(),
  poll_id: z.string().uuid(),
  text: z.string().min(1),
  order_index: z.number().int().min(0),
  // Denormalized cached count (may be absent in some selects)
  vote_count: z.number().int().nonnegative().optional(),
});
export type PollOption = z.infer<typeof pollOptionsSchema>;

// votes table
export const votesSchema = z.object({
  // If your table has an id column, uncomment the next line
  // id: z.string().uuid(),
  poll_id: z.string().uuid(),
  option_id: z.string().uuid(),
  voter_id: z.string().uuid().nullable(),
  vote_hash: z.string().uuid(),
  is_valid: z.boolean(),
});
export type Vote = z.infer<typeof votesSchema>;