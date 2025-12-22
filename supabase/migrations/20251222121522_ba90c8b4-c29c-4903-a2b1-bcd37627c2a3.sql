-- =========================================
-- Story Builder v1: Core Tables
--   1) sb_sessions
--   2) sb_stories
--   3) sb_actions
-- =========================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- -----------------------------------------
-- Helper trigger to keep updated_at current
-- -----------------------------------------
create or replace function public.sb_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- 1) sb_sessions
-- =========================================
create table if not exists public.sb_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text null,
  status text not null default 'active' check (status in ('active', 'archived')),
  current_story_id uuid null, -- fk added after sb_stories exists
  context_defaults jsonb null
);

-- Trigger: keep updated_at in sync on update
drop trigger if exists trg_sb_sessions_set_updated_at on public.sb_sessions;
create trigger trg_sb_sessions_set_updated_at
before update on public.sb_sessions
for each row execute function public.sb_set_updated_at();

-- Indexes
create index if not exists idx_sb_sessions_status on public.sb_sessions(status);
create index if not exists idx_sb_sessions_updated_at on public.sb_sessions(updated_at desc);

-- =========================================
-- 2) sb_stories
-- =========================================
create table if not exists public.sb_stories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sb_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  story jsonb not null,
  source text not null default 'llm' check (source in ('llm', 'quick_fix', 'apply_suggestion', 'manual'))
);

-- Indexes
create index if not exists idx_sb_stories_session_id_created_at
  on public.sb_stories(session_id, created_at desc);

-- =========================================
-- Add FK from sb_sessions.current_story_id -> sb_stories.id
-- (done after sb_stories exists)
-- =========================================
alter table public.sb_sessions
  drop constraint if exists fk_sb_sessions_current_story_id;

alter table public.sb_sessions
  add constraint fk_sb_sessions_current_story_id
  foreign key (current_story_id)
  references public.sb_stories(id)
  on delete set null;

create index if not exists idx_sb_sessions_current_story_id on public.sb_sessions(current_story_id);

-- =========================================
-- 3) sb_actions
-- =========================================
create table if not exists public.sb_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sb_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  action_type text not null check (
    action_type in ('chat', 'generate', 'refine_story', 'refine_field', 'apply_quick_fixes', 'apply_suggestion')
  ),
  prompt_version text not null,
  model text null,
  temperature double precision null,
  inputs jsonb not null default '{}'::jsonb,
  output_raw text null,
  output_format text not null default 'none' check (output_format in ('json', 'text', 'none')),
  before_story_id uuid null references public.sb_stories(id) on delete set null,
  after_story_id uuid null references public.sb_stories(id) on delete set null,
  -- These will be FK'd later when sb_evals and sb_suggestions exist
  eval_result_id uuid null,
  suggestion_id uuid null,
  error text null
);

-- Indexes
create index if not exists idx_sb_actions_session_id_created_at
  on public.sb_actions(session_id, created_at desc);

create index if not exists idx_sb_actions_action_type
  on public.sb_actions(action_type);

create index if not exists idx_sb_actions_before_story_id on public.sb_actions(before_story_id);
create index if not exists idx_sb_actions_after_story_id  on public.sb_actions(after_story_id);