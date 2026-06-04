-- ── Run this in your Supabase SQL editor ──────────────────────────────────

-- User profiles (created on first Slack interaction)
create table if not exists user_profiles (
  id uuid default gen_random_uuid() primary key,
  slack_user_id text unique not null,
  okta_user_id text,
  name text,
  email text,
  role text,
  experience_level text,
  learning_goal text,
  onboarding_complete boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Generated curriculum per user
create table if not exists curricula (
  id uuid default gen_random_uuid() primary key,
  slack_user_id text references user_profiles(slack_user_id) on delete cascade,
  modules jsonb not null,
  created_at timestamp with time zone default now()
);

-- Module progress tracking
create table if not exists module_progress (
  id uuid default gen_random_uuid() primary key,
  slack_user_id text references user_profiles(slack_user_id) on delete cascade,
  module_index integer not null,
  module_title text,
  status text default 'locked', -- locked | in_progress | complete
  branch_choice text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(slack_user_id, module_index)
);

-- Companion chat sessions (question count only — no content stored)
create table if not exists companion_sessions (
  id uuid default gen_random_uuid() primary key,
  slack_user_id text references user_profiles(slack_user_id) on delete cascade,
  question_count integer default 0,
  last_active timestamp with time zone default now(),
  date date default current_date,
  unique(slack_user_id, date)
);

-- Enable Row Level Security
alter table user_profiles enable row level security;
alter table curricula enable row level security;
alter table module_progress enable row level security;
alter table companion_sessions enable row level security;

-- Service role has full access (used by the bot)
create policy "Service role full access" on user_profiles for all using (true);
create policy "Service role full access" on curricula for all using (true);
create policy "Service role full access" on module_progress for all using (true);
create policy "Service role full access" on companion_sessions for all using (true);
