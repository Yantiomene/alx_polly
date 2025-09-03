import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks for Next.js and UI modules used by the page file
vi.mock('next/link', () => ({ default: () => null }))
vi.mock('@/components/ui/card', () => ({
  Card: () => null,
  CardHeader: () => null,
  CardTitle: () => null,
  CardDescription: () => null,
  CardContent: () => null,
}))
vi.mock('@/components/ui/button', () => ({ Button: () => null }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

let mockClient: any
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: vi.fn(() => mockClient),
  createServerActionClient: vi.fn(() => ({})),
}))

// Import after mocks
import { getPollWithOptionsById } from '../lib/polls'
import { shouldBlockVoteWhenSingleAllowed, isAnonymousVoteAllowed } from '../lib/vote-rules'
import type { PollRow } from '../lib/types'

describe('getPollWithOptionsById', () => {
  beforeEach(() => {
    mockClient = {
      from: (table: string) => {
        // Default no-op; individual tests override by setting table-specific behavior
        const chain: any = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.single = async () => ({ data: null, error: { message: 'Not implemented' } })
        chain.order = async () => ({ data: [], error: null })
        return chain
      },
    }
  })

  it('returns null poll when poll not found (early return)', async () => {
    const pollId = 'poll-1'

    const pollsChain = {
      select: () => pollsChain,
      eq: () => pollsChain,
      single: async () => ({ data: null, error: { message: 'Not found' } }),
    }

    mockClient.from = (table: string) => {
      if (table === 'polls') return pollsChain as any
      throw new Error('Should not query other tables when poll not found')
    }

    const result = await getPollWithOptionsById(mockClient, pollId)
    expect(result.poll).toBeNull()
    expect(result.options).toEqual([])
    expect(result.votes).toEqual([])
    expect(result.votesError).toBe(false)
  })

  it('returns poll, options and votes when available (no votes error)', async () => {
    const pollId = 'poll-2'
    const pollRow = {
      id: pollId,
      title: 'Test Poll',
      description: 'desc',
      start_date: null,
      end_date: null,
      allow_multiple_votes: false,
      allow_anonymous_votes: true,
      is_public: true,
      is_active: true,
      creator_id: 'user-1',
    }
    const optionsRows = [
      { id: 'opt-1', text: 'A', order_index: 1, vote_count: 0 },
      { id: 'opt-2', text: 'B', order_index: 2, vote_count: 0 },
    ]
    const votesRows = [{ option_id: 'opt-1' }, { option_id: 'opt-2' }, { option_id: 'opt-1' }]

    const pollsChain = {
      select: () => pollsChain,
      eq: () => pollsChain,
      single: async () => ({ data: pollRow, error: null }),
    }

    const optionsChain = {
      select: () => optionsChain,
      eq: () => optionsChain,
      order: async () => ({ data: optionsRows, error: null }),
    }

    const votesChain = {
      select: () => votesChain,
      eq: async () => ({ data: votesRows, error: null }),
    }

    mockClient.from = (table: string) => {
      if (table === 'polls') return pollsChain as any
      if (table === 'poll_options') return optionsChain as any
      if (table === 'votes') return votesChain as any
      throw new Error('Unexpected table: ' + table)
    }

    const result = await getPollWithOptionsById(mockClient, pollId)
    expect(result.poll).toEqual(pollRow)
    expect(result.options).toEqual(optionsRows)
    expect(result.votes).toEqual(votesRows)
    expect(result.votesError).toBe(false)
  })

  it('flags votesError when reading votes fails (fallback expected)', async () => {
    const pollId = 'poll-3'
    const pollRow = {
      id: pollId,
      title: 'Test Poll 3',
      description: null,
      start_date: null,
      end_date: null,
      allow_multiple_votes: false,
      allow_anonymous_votes: true,
      is_public: true,
      is_active: true,
      creator_id: 'user-3',
    }
    const optionsRows = [{ id: 'opt-10', text: 'X', order_index: 1, vote_count: 5 }]

    const pollsChain = {
      select: () => pollsChain,
      eq: () => pollsChain,
      single: async () => ({ data: pollRow, error: null }),
    }

    const optionsChain = {
      select: () => optionsChain,
      eq: () => optionsChain,
      order: async () => ({ data: optionsRows, error: null }),
    }

    const votesChain = {
      select: () => votesChain,
      eq: async () => ({ data: null, error: { message: 'RLS denied' } }),
    }

    mockClient.from = (table: string) => {
      if (table === 'polls') return pollsChain as any
      if (table === 'poll_options') return optionsChain as any
      if (table === 'votes') return votesChain as any
      throw new Error('Unexpected table: ' + table)
    }

    const result = await getPollWithOptionsById(mockClient, pollId)
    expect(result.poll).toEqual(pollRow)
    expect(result.options).toEqual(optionsRows)
    expect(result.votes).toEqual([])
    expect(result.votesError).toBe(true)
  })
})

// Helper logic tests

describe('shouldBlockVoteWhenSingleAllowed', () => {
  it('blocks when multiple votes not allowed and already voted', () => {
    expect(shouldBlockVoteWhenSingleAllowed({ allow_multiple_votes: false }, true)).toBe(true)
  })
  it('does not block when multiple votes allowed, even if already voted', () => {
    expect(shouldBlockVoteWhenSingleAllowed(buildPoll({ allow_multiple_votes: true }), true)).toBe(false)
  })
  it('does not block when user has not voted yet', () => {
    expect(shouldBlockVoteWhenSingleAllowed(buildPoll({ allow_multiple_votes: false }), false)).toBe(false)
  })
})

describe('isAnonymousVoteAllowed', () => {
  it('allows anonymous vote when poll config allows', () => {
    expect(isAnonymousVoteAllowed(buildPoll({ allow_anonymous_votes: true }))).toBe(true)
  })
  it('disallows anonymous vote when poll config forbids', () => {
    expect(isAnonymousVoteAllowed(buildPoll({ allow_anonymous_votes: false }))).toBe(false)
  })
})