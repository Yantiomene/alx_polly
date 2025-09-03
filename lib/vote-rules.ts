import type { PollRow } from './types';

export function shouldBlockVoteWhenSingleAllowed(poll: PollRow, alreadyVoted: boolean): boolean {
  return !poll.allow_multiple_votes && alreadyVoted;
}

export function isAnonymousVoteAllowed(poll: PollRow): boolean {
  return poll.allow_anonymous_votes;
}

export function canVote(poll: PollRow, optionsLength: number, alreadyVoted: boolean): boolean {
  return poll.is_active && optionsLength > 0 && (poll.allow_multiple_votes || !alreadyVoted);
}