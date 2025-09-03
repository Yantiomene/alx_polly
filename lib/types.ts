export type PollRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  allow_multiple_votes: boolean;
  allow_anonymous_votes: boolean;
  is_public: boolean;
  is_active: boolean;
  creator_id: string;
};

export type OptionRow = {
  id: string;
  text: string;
  order_index: number;
  vote_count?: number; // from schema (cached count)
};

export type VoteRow = {
  option_id: string;
};