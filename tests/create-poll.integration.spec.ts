import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPollAction } from '../app/create-poll/page'

// A higher-level integration test that simulates the full flow of createPollAction
// with environment-like behavior via Supabase client mocks. We assert interactions
// across tables and combined behaviors.

const mockState: any = {
  user: { id: 'user-42' },
  insertedPollId: 'p-1',
  failPollInsert: false,
  failOptionsInsert: false,
  captured: {
    pollInsertPayload: null as any,
    optionsRows: null as any,
    deletedPollId: null as any,
  },
}

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) },
}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerActionClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockState.user } })),
    },
    from: (table: string) => {
      if (table === 'polls') {
        return {
          insert: (payload: any) => {
            mockState.captured.pollInsertPayload = payload
            return {
              select: () => ({
                single: async () => {
                  if (mockState.failPollInsert) return { data: null, error: new Error('poll insert failed') }
                  return { data: { id: mockState.insertedPollId }, error: null }
                },
              }),
            }
          },
          delete: () => ({
            eq: (_k: string, v: string) => {
              mockState.captured.deletedPollId = v
              return {}
            },
          }),
        }
      }
      if (table === 'poll_options') {
        return {
          insert: async (rows: any[]) => {
            mockState.captured.optionsRows = rows
            if (mockState.failOptionsInsert) return { error: new Error('options failed') }
            return { error: null }
          },
        }
      }
      return {}
    },
  }),
  createServerComponentClient: vi.fn(),
}))

function fd(fields: Record<string, string | string[]>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach(val => f.append(k, val))
    else f.set(k, v)
  }
  return f
}

beforeEach(() => {
  mockState.user = { id: 'user-42' }
  mockState.insertedPollId = 'p-1'
  mockState.failPollInsert = false
  mockState.failOptionsInsert = false
  mockState.captured.pollInsertPayload = null
  mockState.captured.optionsRows = null
  mockState.captured.deletedPollId = null
})

describe('createPollAction - integration-ish', () => {
  it('creates poll with metadata and then options; returns success', async () => {
    const form = fd({
      title: 'Best framework?',
      description: 'Pick one',
      'options[]': ['React', 'Svelte', 'Vue'],
      allow_multiple_votes: 'on',
      allow_anonymous_votes: 'on',
      start_date: '2025-01-02T03:04',
      end_date: '2025-02-03T04:05',
    })

    const res = await createPollAction(form as any)
    expect(res).toEqual({ ok: true, pollId: 'p-1' })

    // Validate poll payload includes all expected fields
    expect(mockState.captured.pollInsertPayload).toMatchObject({
      title: 'Best framework?',
      description: 'Pick one',
      is_public: true,
      is_active: true,
      allow_multiple_votes: true,
      allow_anonymous_votes: true,
      start_date: '2025-01-02T03:04',
      end_date: '2025-02-03T04:05',
    })

    // Validate option rows ordering and linkage
    expect(mockState.captured.optionsRows).toEqual([
      { poll_id: 'p-1', text: 'React', order_index: 0 },
      { poll_id: 'p-1', text: 'Svelte', order_index: 1 },
      { poll_id: 'p-1', text: 'Vue', order_index: 2 },
    ])
  })

  it('redirects when not logged in', async () => {
    mockState.user = null
    const form = fd({ title: 'X', 'options[]': ['A', 'B'] })
    await expect(createPollAction(form as any)).rejects.toThrow('REDIRECT:/login')
  })

  it('rolls back poll when options insert fails', async () => {
    mockState.failOptionsInsert = true
    mockState.insertedPollId = 'p-rollback'
    const form = fd({ title: 'X', 'options[]': ['A', 'B'] })

    await expect(createPollAction(form as any)).rejects.toThrow('REDIRECT:/create-poll?error=create_options_failed')
    expect(mockState.captured.deletedPollId).toBe('p-rollback')
  })
})