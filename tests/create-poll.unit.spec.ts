import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mutable mock state to control Supabase and capture inputs per test
const mockState: any = {
  user: { id: 'user-1' },
  pollsInsertResult: { data: { id: 'poll-123' }, error: null },
  optionsInsertError: null,
  capturedPollInsertPayload: null,
  capturedOptionsInsertRows: null,
  deleteCalledWith: null,
}

// Mock next/navigation redirect to throw for easy assertion (avoid top-level spy references)
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) },
}))

// Mock next/headers cookies
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

// Mock @supabase/auth-helpers-nextjs createServerActionClient used by createPollAction
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerActionClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockState.user } })),
    },
    from: (table: string) => {
      if (table === 'polls') {
        return {
          insert: (payload: any) => {
            mockState.capturedPollInsertPayload = payload
            return {
              select: () => ({
                single: async () => mockState.pollsInsertResult,
              }),
            }
          },
          delete: () => ({
            eq: (key: string, value: any) => {
              mockState.deleteCalledWith = { table, eq: [key, value] }
              return {}
            },
          }),
        }
      }
      if (table === 'poll_options') {
        return {
          insert: async (rows: any[]) => {
            mockState.capturedOptionsInsertRows = rows
            return { error: mockState.optionsInsertError }
          },
        }
      }
      return {}
    },
  }),
  createServerComponentClient: vi.fn(),
}))

// Import after mocks are declared
import { createPollAction } from '../app/create-poll/page'

function makeFormData(fields: Record<string, string | string[]>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      for (const vv of v) fd.append(k, vv)
    } else {
      fd.set(k, v)
    }
  }
  return fd
}

beforeEach(() => {
  mockState.user = { id: 'user-1' }
  mockState.pollsInsertResult = { data: { id: 'poll-123' }, error: null }
  mockState.optionsInsertError = null
  mockState.capturedPollInsertPayload = null
  mockState.capturedOptionsInsertRows = null
  mockState.deleteCalledWith = null
})

describe('createPollAction - unit', () => {
  it('redirects to /login when user is not authenticated', async () => {
    mockState.user = null

    const fd = makeFormData({ title: 'T', 'options[]': ['A', 'B'] })

    await expect(createPollAction(fd as any)).rejects.toThrowError('REDIRECT:/login')
  })

  it('redirects invalid_input when title missing or less than two options', async () => {
    const fd1 = makeFormData({ title: '', 'options[]': ['A', 'B'] })
    await expect(createPollAction(fd1 as any)).rejects.toThrowError('REDIRECT:/create-poll?error=invalid_input')

    const fd2 = makeFormData({ title: 'Hello', 'options[]': ['OnlyOne'] })
    await expect(createPollAction(fd2 as any)).rejects.toThrowError('REDIRECT:/create-poll?error=invalid_input')
  })

  it('redirects create_poll_failed when poll insertion fails', async () => {
    mockState.pollsInsertResult = { data: null, error: new Error('fail') }
    const fd = makeFormData({ title: 'T', 'options[]': ['A', 'B'] })

    await expect(createPollAction(fd as any)).rejects.toThrowError('REDIRECT:/create-poll?error=create_poll_failed')
  })

  it('deletes poll and redirects create_options_failed when options insert fails', async () => {
    mockState.pollsInsertResult = { data: { id: 'poll-999' }, error: null }
    mockState.optionsInsertError = new Error('options fail')

    const fd = makeFormData({ title: 'T', 'options[]': ['A', 'B', 'C'] })

    await expect(createPollAction(fd as any)).rejects.toThrowError('REDIRECT:/create-poll?error=create_options_failed')
    expect(mockState.deleteCalledWith).toEqual({ table: 'polls', eq: ['id', 'poll-999'] })
  })

  it('returns ok and pollId on success and inserts correct option rows', async () => {
    mockState.pollsInsertResult = { data: { id: 'poll-abc' }, error: null }
    const fd = makeFormData({ title: 'My Poll', 'options[]': ['A', 'B', 'C'] })

    const res = await createPollAction(fd as any)
    expect(res).toEqual({ ok: true, pollId: 'poll-abc' })

    expect(mockState.capturedOptionsInsertRows).toEqual([
      { poll_id: 'poll-abc', text: 'A', order_index: 0 },
      { poll_id: 'poll-abc', text: 'B', order_index: 1 },
      { poll_id: 'poll-abc', text: 'C', order_index: 2 },
    ])
  })
})